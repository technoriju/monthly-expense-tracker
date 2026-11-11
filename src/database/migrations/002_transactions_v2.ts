import type { Migration } from './types';

/**
 * Phase "Manual Transactions": optional payment method + query indexes.
 * The category foreign key already exists from 001 (enforced via `PRAGMA foreign_keys = ON`).
 */
export const migration002TransactionsV2: Migration = {
  version: 2,
  name: 'transactions_v2',
  async up(db) {
    await db.execAsync(`
      ALTER TABLE transactions ADD COLUMN payment_method TEXT
        CHECK (payment_method IS NULL OR payment_method IN ('cash','upi','card','bank_transfer','other'));

      CREATE INDEX idx_categories_type ON categories (type, is_archived, sort_order);
      CREATE INDEX idx_tx_date_created ON transactions (occurred_on, created_at);
    `);
  },
};
