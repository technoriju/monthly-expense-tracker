import type { Migration } from './types';

/**
 * Phase "Hardening": the tables are not STRICT, so a plain CHECK (amount_minor > 0) still
 * accepts 1.5 or text. These triggers reject any amount that is not an integer within the
 * app's ceiling (MAX_AMOUNT_MINOR, ₹99,99,99,999.99 — frozen here as a literal because a
 * shipped migration must never change). Existing rows are not touched.
 * Also indexes budgets by (month, currency), the lookup every budget screen runs.
 */
export const migration004AmountGuards: Migration = {
  version: 4,
  name: 'amount_guards',
  async up(db) {
    await db.execAsync(`
      CREATE TRIGGER trg_transactions_amount_insert
        BEFORE INSERT ON transactions
        WHEN typeof(NEW.amount_minor) <> 'integer' OR NEW.amount_minor > 999999999999
      BEGIN
        SELECT RAISE(ABORT, 'amount_minor_invalid');
      END;

      CREATE TRIGGER trg_transactions_amount_update
        BEFORE UPDATE OF amount_minor ON transactions
        WHEN typeof(NEW.amount_minor) <> 'integer' OR NEW.amount_minor > 999999999999
      BEGIN
        SELECT RAISE(ABORT, 'amount_minor_invalid');
      END;

      CREATE TRIGGER trg_budgets_amount_insert
        BEFORE INSERT ON budgets
        WHEN typeof(NEW.amount_minor) <> 'integer' OR NEW.amount_minor > 999999999999
      BEGIN
        SELECT RAISE(ABORT, 'amount_minor_invalid');
      END;

      CREATE TRIGGER trg_budgets_amount_update
        BEFORE UPDATE OF amount_minor ON budgets
        WHEN typeof(NEW.amount_minor) <> 'integer' OR NEW.amount_minor > 999999999999
      BEGIN
        SELECT RAISE(ABORT, 'amount_minor_invalid');
      END;

      CREATE INDEX idx_budgets_month_currency ON budgets (month, currency);
    `);
  },
};
