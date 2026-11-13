import type { Migration } from './types';

/** Integer paise in 0 … MAX_AMOUNT_MINOR (frozen literal, as in migration 004), or NULL. */
const amount = (column: string) =>
  `CHECK (${column} IS NULL OR (typeof(${column}) = 'integer' AND ${column} BETWEEN 0 AND 999999999999))`;

/**
 * Phase "Receipt Scanner": a scanned receipt attached to one expense, and its item rows.
 *
 * - The confirmed total is the transaction's own `amount_minor`; it is not stored again, so
 *   the receipt and its expense can never disagree. `extracted_total_minor` keeps what OCR read.
 * - Deleting the transaction deletes its receipt and items (ON DELETE CASCADE).
 * - `save_key` is the review draft's id: a retried save finds the existing row instead of
 *   creating a second expense.
 * - Images live in app files; only the file name is stored.
 * - Quantities are thousandths (`quantity_milli`) so 0.5 kg stays an integer.
 */
export const migration005Receipts: Migration = {
  version: 5,
  name: 'receipts',
  async up(db) {
    await db.execAsync(`
      CREATE TABLE receipts (
        id                     INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id         INTEGER NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
        save_key               TEXT    NOT NULL UNIQUE,
        vendor_name            TEXT,
        receipt_number         TEXT,
        receipt_date           TEXT CHECK (receipt_date IS NULL OR
                                 receipt_date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
        image_file             TEXT,
        original_ocr_text      TEXT,
        ocr_provider           TEXT,
        extracted_total_minor  INTEGER ${amount('extracted_total_minor')},
        subtotal_minor         INTEGER ${amount('subtotal_minor')},
        tax_minor              INTEGER ${amount('tax_minor')},
        discount_minor         INTEGER ${amount('discount_minor')},
        charges_minor          INTEGER ${amount('charges_minor')},
        round_off_minor        INTEGER CHECK (round_off_minor IS NULL OR
                                 (typeof(round_off_minor) = 'integer' AND
                                  round_off_minor BETWEEN -999999999999 AND 999999999999)),
        created_at             INTEGER NOT NULL,
        updated_at             INTEGER NOT NULL
      );

      CREATE TABLE receipt_items (
        id                 INTEGER PRIMARY KEY AUTOINCREMENT,
        receipt_id         INTEGER NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
        position           INTEGER NOT NULL,
        item_name          TEXT,
        original_ocr_name  TEXT,
        quantity_milli     INTEGER CHECK (quantity_milli IS NULL OR
                             (typeof(quantity_milli) = 'integer' AND quantity_milli BETWEEN 0 AND 99999999)),
        unit               TEXT,
        unit_price_minor   INTEGER ${amount('unit_price_minor')},
        line_total_minor   INTEGER ${amount('line_total_minor')},
        name_confidence    REAL,
        amount_confidence  REAL,
        flags              TEXT    NOT NULL DEFAULT '[]',
        user_corrected     INTEGER NOT NULL DEFAULT 0 CHECK (user_corrected IN (0, 1)),
        created_at         INTEGER NOT NULL
      );

      CREATE INDEX idx_receipt_items_receipt ON receipt_items (receipt_id, position);
      CREATE INDEX idx_receipts_date ON receipts (receipt_date);
    `);
  },
};
