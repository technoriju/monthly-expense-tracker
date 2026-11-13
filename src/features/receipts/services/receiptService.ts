import { receiptRepository } from '@/database';
import { validateTransactionInput } from '@/features/transactions/services/transactionService';
import type { Transaction, TransactionInput } from '@/features/transactions/types';
import { useSettingsStore } from '@/store/settingsStore';
import { useUiStore } from '@/store/uiStore';
import type { MinorAmount } from '@/types/money';
import type { IsoDate } from '@/utils/dates';

import {
  OCR_TEXT_MAX_LENGTH,
  receiptDetailsSchema,
  receiptExtrasSchema,
  saveKeySchema,
} from '../schemas';
import type { Receipt, ReceiptDetailsUpdate } from '../types';
import { receiptImageStore } from './receiptImageStore';

export type ReceiptErrorCode = 'notExpense' | 'invalid' | 'imageMissing' | 'notFound';

export class ReceiptError extends Error {
  constructor(readonly code: ReceiptErrorCode) {
    super(`Receipt error: ${code}`);
    this.name = 'ReceiptError';
  }
}

export interface ReceiptSaveInput {
  /** Review draft id: retrying the same draft never creates a second expense. */
  saveKey: string;
  transaction: TransactionInput;
  details: ReceiptDetailsUpdate;
  extras: {
    originalOcrText: string | null;
    ocrProvider: string | null;
    extractedTotalMinor: MinorAmount | null;
    subtotalMinor: MinorAmount | null;
    taxMinor: MinorAmount | null;
    discountMinor: MinorAmount | null;
    chargesMinor: MinorAmount | null;
    roundOffMinor: MinorAmount | null;
  };
  /** File name from `receiptImageStore.saveDraftImage`, or null to save without a photo. */
  imageFile: string | null;
}

export interface ReceiptView {
  receipt: Receipt;
  /** Null when the photo file is gone (the receipt data is still shown). */
  imageUri: string | null;
}

function dataChanged(): void {
  useUiStore.getState().bumpDataVersion();
}

export const receiptService = {
  /**
   * Saves a reviewed receipt: the expense, receipt and items are written in one database
   * transaction (all or nothing). The confirmed total is the expense amount. Called only from
   * the review screen after the user pressed Save — OCR results are never saved on their own.
   */
  async save(input: ReceiptSaveInput): Promise<{ transaction: Transaction; created: boolean }> {
    if (input.transaction.type !== 'expense') throw new ReceiptError('notExpense');
    const saveKey = saveKeySchema.safeParse(input.saveKey);
    const details = receiptDetailsSchema.safeParse(input.details);
    const extras = receiptExtrasSchema.safeParse({
      ...input.extras,
      originalOcrText: input.extras.originalOcrText?.slice(0, OCR_TEXT_MAX_LENGTH) ?? null,
    });
    if (!saveKey.success || !details.success || !extras.success) {
      throw new ReceiptError('invalid');
    }
    const transaction = await validateTransactionInput(input.transaction);
    if (input.imageFile !== null && receiptImageStore.uriOf(input.imageFile) === null) {
      // The photo vanished (storage cleared). The caller asks the user before saving without it.
      throw new ReceiptError('imageMissing');
    }

    const result = await receiptRepository.createWithTransaction(
      {
        ...transaction,
        currency: useSettingsStore.getState().currency,
        source: 'manual',
        voiceTranscript: null,
      },
      {
        saveKey: saveKey.data,
        ...extras.data,
        imageFile: input.imageFile,
        ...stripItems(details.data),
      },
      details.data.items,
    );
    dataChanged();
    return result;
  },

  async getForTransaction(transactionId: number): Promise<ReceiptView | null> {
    const receipt = await receiptRepository.getByTransactionId(transactionId);
    if (!receipt) return null;
    return { receipt, imageUri: receiptImageStore.uriOf(receipt.imageFile) };
  },

  async updateDetails(receiptId: number, update: ReceiptDetailsUpdate): Promise<void> {
    const parsed = receiptDetailsSchema.safeParse(update);
    if (!parsed.success) throw new ReceiptError('invalid');
    const found = await receiptRepository.updateDetails(receiptId, parsed.data);
    if (!found) throw new ReceiptError('notFound');
    dataChanged();
  },

  /** Removes the receipt and its photo; the expense stays. */
  async removeAttachment(transactionId: number): Promise<void> {
    const removed = await receiptRepository.removeByTransactionId(transactionId);
    if (!removed) throw new ReceiptError('notFound');
    deleteImageQuietly(removed.imageFile);
    dataChanged();
  },

  /** A receipt expense already saved with this date and amount (possible duplicate scan). */
  findSimilar(occurredOn: IsoDate, amountMinor: MinorAmount): Promise<number | null> {
    return receiptRepository.findSimilar(occurredOn, amountMinor);
  },

  /** Deletes photos no saved receipt uses, keeping the open draft's photo. */
  async sweepOrphanImages(keep: string | null): Promise<void> {
    const names = new Set(await receiptRepository.listImageFiles());
    if (keep !== null) names.add(keep);
    try {
      receiptImageStore.sweep(names);
    } catch (error) {
      console.warn('Receipt image cleanup failed', error);
    }
  },
};

function stripItems({ vendorName, receiptNumber, receiptDate }: ReceiptDetailsUpdate) {
  return { vendorName, receiptNumber, receiptDate };
}

/** File cleanup must never turn a successful database change into an error. */
export function deleteImageQuietly(name: string | null): void {
  try {
    receiptImageStore.delete(name);
  } catch (error) {
    console.warn('Receipt image delete failed', error);
  }
}
