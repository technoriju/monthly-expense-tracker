import type { Budget, BudgetMonth, BudgetRecord, BudgetType } from '@/features/budgets/types';
import type { CurrencyCode, MinorAmount } from '@/types/money';

import { getDatabase } from '../client';

interface BudgetRow {
  id: number;
  budget_type: BudgetType;
  category_id: number | null;
  amount_minor: number;
  currency: CurrencyCode;
  month: string;
  created_at: number;
  updated_at: number;
}

const COLUMNS =
  'id, budget_type, category_id, amount_minor, currency, month, created_at, updated_at';

function mapRow(row: BudgetRow): Budget {
  return {
    id: row.id,
    budgetType: row.budget_type,
    categoryId: row.category_id,
    amountMinor: row.amount_minor,
    currency: row.currency,
    month: row.month,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** SQL only — no business rules. Validation lives in budgetService. */
export const budgetRepository = {
  /** Every budget of one month and currency: overall first, then by category id. */
  async listByMonth(month: BudgetMonth, currency: CurrencyCode): Promise<Budget[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<BudgetRow>(
      `SELECT ${COLUMNS} FROM budgets
        WHERE month = ? AND currency = ?
        ORDER BY category_id IS NOT NULL, category_id`,
      [month, currency],
    );
    return rows.map(mapRow);
  },

  async getById(id: number): Promise<Budget | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<BudgetRow>(`SELECT ${COLUMNS} FROM budgets WHERE id = ?`, [
      id,
    ]);
    return row ? mapRow(row) : null;
  },

  /** The budget for (month, currency, category); `categoryId` null = overall budget. */
  async find(
    month: BudgetMonth,
    currency: CurrencyCode,
    categoryId: number | null,
  ): Promise<Budget | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<BudgetRow>(
      `SELECT ${COLUMNS} FROM budgets
        WHERE month = ? AND currency = ? AND category_id IS ?`,
      [month, currency, categoryId],
    );
    return row ? mapRow(row) : null;
  },

  async insert(record: BudgetRecord, now: number = Date.now()): Promise<number> {
    const db = await getDatabase();
    const result = await db.runAsync(
      `INSERT INTO budgets
         (budget_type, category_id, amount_minor, currency, month, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        record.budgetType,
        record.categoryId,
        record.amountMinor,
        record.currency,
        record.month,
        now,
        now,
      ],
    );
    return result.lastInsertRowId;
  },

  /** Changes the amount. Returns false when the row no longer exists. */
  async updateAmount(
    id: number,
    amountMinor: MinorAmount,
    now: number = Date.now(),
  ): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync(
      'UPDATE budgets SET amount_minor = ?, updated_at = ? WHERE id = ?',
      [amountMinor, now, id],
    );
    return result.changes > 0;
  },

  /** Returns false when the row did not exist. */
  async remove(id: number): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync('DELETE FROM budgets WHERE id = ?', [id]);
    return result.changes > 0;
  },
};
