import type { Migration } from './types';

/**
 * Phase "Budgets": monthly overall and per-expense-category budgets.
 * `month` is 'YYYY-MM'; amounts are integer minor units in the stored currency.
 * NULLs are distinct in UNIQUE constraints, so uniqueness uses two partial indexes.
 * Triggers keep category budgets on expense categories only.
 */
export const migration003Budgets: Migration = {
  version: 3,
  name: 'budgets',
  async up(db) {
    await db.execAsync(`
      CREATE TABLE budgets (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        budget_type   TEXT    NOT NULL CHECK (budget_type IN ('overall','category')),
        category_id   INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
        amount_minor  INTEGER NOT NULL CHECK (amount_minor > 0),
        currency      TEXT    NOT NULL,
        month         TEXT    NOT NULL
                      CHECK (month GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'
                             AND substr(month, 6, 2) BETWEEN '01' AND '12'),
        created_at    INTEGER NOT NULL,
        updated_at    INTEGER NOT NULL,
        CHECK ((budget_type = 'overall'  AND category_id IS NULL) OR
               (budget_type = 'category' AND category_id IS NOT NULL))
      );

      CREATE UNIQUE INDEX ux_budgets_overall
        ON budgets (month, currency) WHERE category_id IS NULL;
      CREATE UNIQUE INDEX ux_budgets_category
        ON budgets (month, currency, category_id) WHERE category_id IS NOT NULL;
      CREATE INDEX idx_budgets_category ON budgets (category_id);

      CREATE TRIGGER trg_budgets_expense_category_insert
        BEFORE INSERT ON budgets
        WHEN NEW.category_id IS NOT NULL
         AND (SELECT type FROM categories WHERE id = NEW.category_id) IS NOT 'expense'
      BEGIN
        SELECT RAISE(ABORT, 'budget_category_not_expense');
      END;

      CREATE TRIGGER trg_budgets_expense_category_update
        BEFORE UPDATE OF category_id ON budgets
        WHEN NEW.category_id IS NOT NULL
         AND (SELECT type FROM categories WHERE id = NEW.category_id) IS NOT 'expense'
      BEGIN
        SELECT RAISE(ABORT, 'budget_category_not_expense');
      END;
    `);
  },
};
