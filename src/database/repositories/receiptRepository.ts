import type {
  Receipt,
  ReceiptDetailsUpdate,
  ReceiptItem,
  ReceiptItemFlag,
  ReceiptItemRecord,
  ReceiptRecord,
} from '@/features/receipts/types';
import type { Transaction, TransactionRecord } from '@/features/transactions/types';
import type { MinorAmount } from '@/types/money';
import type { IsoDate } from '@/utils/dates';

import { getDatabase } from '../client';
import { transactionRepository } from './transactionRepository';

interface ReceiptRow {
  id: number;
  transaction_id: number;
  save_key: string;
  vendor_name: string | null;
  receipt_number: string | null;
  receipt_date: string | null;
  image_file: string | null;
  original_ocr_text: string | null;
  ocr_provider: string | null;
  extracted_total_minor: number | null;
  subtotal_minor: number | null;
  tax_minor: number | null;
  discount_minor: number | null;
  charges_minor: number | null;
  round_off_minor: number | null;
  created_at: number;
  updated_at: number;
}

interface ReceiptItemRow {
  id: number;
  position: number;
  item_name: string | null;
  original_ocr_name: string | null;
  quantity_milli: number | null;
  unit: string | null;
  unit_price_minor: number | null;
  line_total_minor: number | null;
  name_confidence: number | null;
  amount_confidence: number | null;
  flags: string;
  user_corrected: number;
}

const ITEM_FLAGS: readonly ReceiptItemFlag[] = [
  'nameUncertain',
  'amountUncertain',
  'suspicious',
  'quantityMismatch',
];

function parseFlags(json: string): ReceiptItemFlag[] {
  try {
    const value: unknown = JSON.parse(json);
    return Array.isArray(value)
      ? value.filter((f): f is ReceiptItemFlag => ITEM_FLAGS.includes(f as ReceiptItemFlag))
      : [];
  } catch {
    return [];
  }
}

function mapItem(row: ReceiptItemRow): ReceiptItem {
  return {
    id: row.id,
    position: row.position,
    itemName: row.item_name,
    originalOcrName: row.original_ocr_name,
    quantityMilli: row.quantity_milli,
    unit: row.unit,
    unitPriceMinor: row.unit_price_minor,
    lineTotalMinor: row.line_total_minor,
    nameConfidence: row.name_confidence,
    amountConfidence: row.amount_confidence,
    flags: parseFlags(row.flags),
    userCorrected: row.user_corrected === 1,
  };
}

function mapReceipt(row: ReceiptRow, items: ReceiptItem[]): Receipt {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    saveKey: row.save_key,
    vendorName: row.vendor_name,
    receiptNumber: row.receipt_number,
    receiptDate: row.receipt_date,
    imageFile: row.image_file,
    originalOcrText: row.original_ocr_text,
    ocrProvider: row.ocr_provider,
    extractedTotalMinor: row.extracted_total_minor,
    subtotalMinor: row.subtotal_minor,
    taxMinor: row.tax_minor,
    discountMinor: row.discount_minor,
    chargesMinor: row.charges_minor,
    roundOffMinor: row.round_off_minor,
    items,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function insertItems(
  receiptId: number,
  items: readonly ReceiptItemRecord[],
  now: number,
): Promise<void> {
  const db = await getDatabase();
  for (const [position, item] of items.entries()) {
    await db.runAsync(
      `INSERT INTO receipt_items
         (receipt_id, position, item_name, original_ocr_name, quantity_milli, unit,
          unit_price_minor, line_total_minor, name_confidence, amount_confidence, flags,
          user_corrected, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        receiptId,
        position,
        item.itemName,
        item.originalOcrName,
        item.quantityMilli,
        item.unit,
        item.unitPriceMinor,
        item.lineTotalMinor,
        item.nameConfidence,
        item.amountConfidence,
        JSON.stringify(item.flags),
        item.userCorrected ? 1 : 0,
        now,
      ],
    );
  }
}

export interface CreateWithReceiptResult {
  transaction: Transaction;
  /** False when `saveKey` was already saved (a retry): the existing expense is returned. */
  created: boolean;
}

/** SQL only — validation and image files are handled by receiptService. */
export const receiptRepository = {
  /**
   * Creates the expense, its receipt and item rows in one transaction: either all are stored
   * or none. A `saveKey` that already exists returns the earlier expense (no duplicate).
   */
  async createWithTransaction(
    transaction: TransactionRecord,
    receipt: ReceiptRecord,
    items: readonly ReceiptItemRecord[],
    now: number = Date.now(),
  ): Promise<CreateWithReceiptResult> {
    const db = await getDatabase();
    const result: { value?: CreateWithReceiptResult } = {};
    await db.withTransactionAsync(async () => {
      const existing = await db.getFirstAsync<{ transaction_id: number }>(
        'SELECT transaction_id FROM receipts WHERE save_key = ?',
        [receipt.saveKey],
      );
      if (existing) {
        const row = await transactionRepository.getById(existing.transaction_id);
        if (!row) throw new Error('Receipt points to a missing transaction');
        result.value = { transaction: row, created: false };
        return;
      }
      const transactionId = await transactionRepository.insert(transaction, now);
      const inserted = await db.runAsync(
        `INSERT INTO receipts
           (transaction_id, save_key, vendor_name, receipt_number, receipt_date, image_file,
            original_ocr_text, ocr_provider, extracted_total_minor, subtotal_minor, tax_minor,
            discount_minor, charges_minor, round_off_minor, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transactionId,
          receipt.saveKey,
          receipt.vendorName,
          receipt.receiptNumber,
          receipt.receiptDate,
          receipt.imageFile,
          receipt.originalOcrText,
          receipt.ocrProvider,
          receipt.extractedTotalMinor,
          receipt.subtotalMinor,
          receipt.taxMinor,
          receipt.discountMinor,
          receipt.chargesMinor,
          receipt.roundOffMinor,
          now,
          now,
        ],
      );
      await insertItems(inserted.lastInsertRowId, items, now);
      const row = await transactionRepository.getById(transactionId);
      if (!row) throw new Error('Inserted transaction could not be read back');
      result.value = { transaction: row, created: true };
    });
    if (!result.value) throw new Error('Receipt save returned no result');
    return result.value;
  },

  async getByTransactionId(transactionId: number): Promise<Receipt | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<ReceiptRow>(
      'SELECT * FROM receipts WHERE transaction_id = ?',
      [transactionId],
    );
    if (!row) return null;
    const items = await db.getAllAsync<ReceiptItemRow>(
      'SELECT * FROM receipt_items WHERE receipt_id = ? ORDER BY position, id',
      [row.id],
    );
    return mapReceipt(row, items.map(mapItem));
  },

  /** Replaces the editable details and all item rows. Returns false when the receipt is gone. */
  async updateDetails(
    receiptId: number,
    update: ReceiptDetailsUpdate,
    now: number = Date.now(),
  ): Promise<boolean> {
    const db = await getDatabase();
    let found = false;
    await db.withTransactionAsync(async () => {
      const result = await db.runAsync(
        `UPDATE receipts SET vendor_name = ?, receipt_number = ?, receipt_date = ?, updated_at = ?
          WHERE id = ?`,
        [update.vendorName, update.receiptNumber, update.receiptDate, now, receiptId],
      );
      found = result.changes > 0;
      if (!found) return;
      await db.runAsync('DELETE FROM receipt_items WHERE receipt_id = ?', [receiptId]);
      await insertItems(receiptId, update.items, now);
    });
    return found;
  },

  /**
   * Deletes the receipt (and its items) of a transaction; the expense stays. Returns the image
   * file name so the caller can delete the file, or undefined when there was no receipt.
   */
  async removeByTransactionId(
    transactionId: number,
  ): Promise<{ imageFile: string | null } | undefined> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ image_file: string | null }>(
      'SELECT image_file FROM receipts WHERE transaction_id = ?',
      [transactionId],
    );
    if (!row) return undefined;
    await db.runAsync('DELETE FROM receipts WHERE transaction_id = ?', [transactionId]);
    return { imageFile: row.image_file };
  },

  async getImageFile(transactionId: number): Promise<string | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ image_file: string | null }>(
      'SELECT image_file FROM receipts WHERE transaction_id = ?',
      [transactionId],
    );
    return row?.image_file ?? null;
  },

  /** Every image file name still referenced (for cleaning up orphaned files). */
  async listImageFiles(): Promise<string[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ image_file: string }>(
      'SELECT image_file FROM receipts WHERE image_file IS NOT NULL',
    );
    return rows.map((r) => r.image_file);
  },

  /** An already-saved receipt expense with the same date and amount (possible duplicate scan). */
  async findSimilar(occurredOn: IsoDate, amountMinor: MinorAmount): Promise<number | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ id: number }>(
      `SELECT t.id FROM transactions t
         JOIN receipts r ON r.transaction_id = t.id
        WHERE t.occurred_on = ? AND t.amount_minor = ?
        ORDER BY t.id DESC LIMIT 1`,
      [occurredOn, amountMinor],
    );
    return row?.id ?? null;
  },
};
