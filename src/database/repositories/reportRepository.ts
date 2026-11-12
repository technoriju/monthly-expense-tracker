import type {
  CategoryTotalRow,
  DailyTotalRow,
  MonthlyTotalRow,
  TypeTotalRow,
} from '@/features/reports/types';
import type { CurrencyCode, TransactionType } from '@/types/money';
import type { IsoDate } from '@/utils/dates';

import { getDatabase } from '../client';
import { mapCategoryRow, type CategoryRow } from './categoryRepository';

const RANGE = 'occurred_on BETWEEN ? AND ? AND currency = ?';

/**
 * Aggregation queries for reports. SQL only — all inputs are an inclusive local date range
 * plus the active currency; sums are integer minor units straight from SQLite.
 */
export const reportRepository = {
  /** Sum and count per transaction type. Types without rows are omitted. */
  async getTypeTotals(from: IsoDate, to: IsoDate, currency: CurrencyCode): Promise<TypeTotalRow[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ type: TransactionType; total: number; count: number }>(
      `SELECT type, SUM(amount_minor) AS total, COUNT(*) AS count
         FROM transactions
        WHERE ${RANGE}
        GROUP BY type`,
      [from, to, currency],
    );
    return rows.map((r) => ({ type: r.type, totalMinor: r.total, count: r.count }));
  },

  /** Sum and count per category of one type, largest total first. */
  async getCategoryTotals(
    from: IsoDate,
    to: IsoDate,
    currency: CurrencyCode,
    type: TransactionType,
  ): Promise<CategoryTotalRow[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<CategoryRow & { total: number; count: number }>(
      `SELECT c.id, c.key, c.type, c.icon, c.color, c.sort_order, c.is_system, c.custom_name, c.created_at,
              SUM(t.amount_minor) AS total, COUNT(*) AS count
         FROM transactions t
         JOIN categories c ON c.id = t.category_id
        WHERE t.occurred_on BETWEEN ? AND ? AND t.currency = ? AND t.type = ?
        GROUP BY c.id
        ORDER BY total DESC, c.sort_order, c.id`,
      [from, to, currency, type],
    );
    return rows.map((r) => ({ category: mapCategoryRow(r), totalMinor: r.total, count: r.count }));
  },

  /** Sum and count per day and type. Days without rows are omitted. */
  async getDailyTotals(
    from: IsoDate,
    to: IsoDate,
    currency: CurrencyCode,
  ): Promise<DailyTotalRow[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      date: string;
      type: TransactionType;
      total: number;
      count: number;
    }>(
      `SELECT occurred_on AS date, type, SUM(amount_minor) AS total, COUNT(*) AS count
         FROM transactions
        WHERE ${RANGE}
        GROUP BY occurred_on, type
        ORDER BY occurred_on`,
      [from, to, currency],
    );
    return rows.map((r) => ({ date: r.date, type: r.type, totalMinor: r.total, count: r.count }));
  },

  /** Sum and count per calendar month ('YYYY-MM') and type. */
  async getMonthlyTotals(
    from: IsoDate,
    to: IsoDate,
    currency: CurrencyCode,
  ): Promise<MonthlyTotalRow[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      month: string;
      type: TransactionType;
      total: number;
      count: number;
    }>(
      `SELECT substr(occurred_on, 1, 7) AS month, type, SUM(amount_minor) AS total,
              COUNT(*) AS count
         FROM transactions
        WHERE ${RANGE}
        GROUP BY month, type
        ORDER BY month`,
      [from, to, currency],
    );
    return rows.map((r) => ({
      month: r.month,
      type: r.type,
      totalMinor: r.total,
      count: r.count,
    }));
  },
};
