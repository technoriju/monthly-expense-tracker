import type { TransactionFormValues } from '@/features/transactions/schemas';
import type { MinorAmount } from '@/types/money';
import { toIsoDate } from '@/utils/dates';
import { minorToInputString } from '@/utils/money';

import type { ParsedReceipt, ReceiptFlag, ReceiptItemDraft, TotalCandidate } from './types';

export const RECEIPT_DRAFT_VERSION = 1;

/**
 * A receipt under review. Lives in memory and in `receipts/draft.json` so edits survive the
 * app closing; never in SQLite until the user saves.
 */
export interface ReceiptDraft {
  version: typeof RECEIPT_DRAFT_VERSION;
  /** Also the save key (idempotent save) and the photo's file name stem. */
  id: string;
  createdAt: number;
  imageFile: string | null;
  ocrProvider: string | null;
  originalOcrText: string | null;
  /** Grand total OCR chose (null when none or ambiguous). */
  extractedTotalMinor: MinorAmount | null;
  totalCandidates: TotalCandidate[];
  flags: ReceiptFlag[];
  vendorName: string;
  receiptNumber: string;
  items: ReceiptItemDraft[];
  subtotalMinor: MinorAmount | null;
  taxMinor: MinorAmount | null;
  discountMinor: MinorAmount | null;
  chargesMinor: MinorAmount | null;
  roundOffMinor: MinorAmount | null;
  form: TransactionFormValues;
  /** The user changed something, so a rescan must ask before replacing it. */
  edited: boolean;
}

export interface NewDraftInput {
  id: string;
  imageFile: string | null;
  parsed: ParsedReceipt | null;
  ocrProvider: string | null;
  currency: 'INR';
  today: Date;
  now?: number;
}

/** Builds the review draft from a parse (or an empty one for manual entry). */
export function createReceiptDraft(input: NewDraftInput): ReceiptDraft {
  const { parsed } = input;
  const total = parsed?.grandTotalMinor ?? null;
  return {
    version: RECEIPT_DRAFT_VERSION,
    id: input.id,
    createdAt: input.now ?? Date.now(),
    imageFile: input.imageFile,
    ocrProvider: input.ocrProvider,
    originalOcrText: parsed?.originalText ?? null,
    extractedTotalMinor: total,
    totalCandidates: parsed?.totalCandidates ?? [],
    flags: parsed?.flags ?? [],
    vendorName: parsed?.vendorName ?? '',
    receiptNumber: parsed?.receiptNumber ?? '',
    items: parsed?.items ?? [],
    subtotalMinor: parsed?.subtotalMinor ?? null,
    taxMinor: parsed?.taxMinor ?? null,
    discountMinor: parsed?.discountMinor ?? null,
    chargesMinor: parsed?.chargesMinor ?? null,
    roundOffMinor: parsed?.roundOffMinor ?? null,
    form: {
      type: 'expense',
      amount: total === null ? '' : minorToInputString(total, input.currency),
      categoryId: null,
      occurredOn: parsed?.receiptDate ?? toIsoDate(input.today),
      note: '',
      paymentMethod: parsed?.paymentMethod ?? null,
    },
    edited: false,
  };
}

/** Reads a stored draft; anything unexpected is discarded (returns null), never trusted. */
export function parseStoredDraft(json: string | null): ReceiptDraft | null {
  if (json === null) return null;
  try {
    const value = JSON.parse(json) as Partial<ReceiptDraft> | null;
    if (
      !value ||
      value.version !== RECEIPT_DRAFT_VERSION ||
      typeof value.id !== 'string' ||
      !Array.isArray(value.items) ||
      typeof value.form !== 'object' ||
      value.form === null
    ) {
      return null;
    }
    return value as ReceiptDraft;
  } catch {
    return null;
  }
}
