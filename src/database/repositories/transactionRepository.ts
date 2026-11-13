import type { SQLiteBindValue } from 'expo-sqlite';

import type {
  Page,
  Transaction,
  TransactionQuery,
  TransactionRecord,
} from '@/features/transactions/types';
import type { CurrencyCode, MinorAmount, PaymentMethod, TransactionType } from '@/types/money';
import type { IsoDate } from '@/utils/dates';

import { getDatabase } from '../client';
import { mapCategoryRow } from './categoryRepository';

interface TransactionRow {
  id: number;
  type: TransactionType;
  amount_minor: number;
  currency: CurrencyCode;
  category_id: number;
  occurred_on: string;
  note: string | null;
  payment_method: PaymentMethod | null;
  source: 'manual' | 'voice';
  created_at: number;
  updated_at: number;
  c_key: string;
  c_type: TransactionType;
  c_icon: string;
  c_color: string;
  c_sort_order: number;
  c_is_system: number;
  c_custom_name: string | null;
  c_created_at: number;
  has_receipt: number;
}

const SELECT = `
  SELECT t.id, t.type, t.amount_minor, t.currency, t.category_id, t.occurred_on, t.note,
         t.payment_method, t.source, t.created_at, t.updated_at,
         c.key AS c_key, c.type AS c_type, c.icon AS c_icon, c.color AS c_color,
         c.sort_order AS c_sort_order, c.is_system AS c_is_system,
         c.custom_name AS c_custom_name, c.created_at AS c_created_at,
         (r.id IS NOT NULL) AS has_receipt
  FROM transactions t
  JOIN categories c ON c.id = t.category_id
  LEFT JOIN receipts r ON r.transaction_id = t.id`;

function mapRow(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type,
    amountMinor: row.amount_minor,
    currency: row.currency,
    categoryId: row.category_id,
    category: mapCategoryRow({
      id: row.category_id,
      key: row.c_key,
      type: row.c_type,
      icon: row.c_icon,
      color: row.c_color,
      sort_order: row.c_sort_order,
      is_system: row.c_is_system,
      custom_name: row.c_custom_name,
      created_at: row.c_created_at,
    }),
    occurredOn: row.occurred_on,
    note: row.note,
    paymentMethod: row.payment_method,
    source: row.source,
    hasReceipt: row.has_receipt === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const LIKE_ESCAPE = '\\';

/** Escapes LIKE wildcards so user text is matched literally. */
function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (ch) => `${LIKE_ESCAPE}${ch}`)}%`;
}

function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}

function buildWhere(query: TransactionQuery): { sql: string; params: SQLiteBindValue[] } {
  const clauses: string[] = [];
  const params: SQLiteBindValue[] = [];
  if (query.type) {
    clauses.push('t.type = ?');
    params.push(query.type);
  }
  if (query.categoryIds) {
    if (query.categoryIds.length === 0) {
      clauses.push('0');
    } else {
      clauses.push(`t.category_id IN (${placeholders(query.categoryIds.length)})`);
      params.push(...query.categoryIds);
    }
  }
  if (query.currency) {
    clauses.push('t.currency = ?');
    params.push(query.currency);
  }
  if (query.dateFrom) {
    clauses.push('t.occurred_on >= ?');
    params.push(query.dateFrom);
  }
  if (query.dateTo) {
    clauses.push('t.occurred_on <= ?');
    params.push(query.dateTo);
  }
  if (query.search) {
    const { text, categoryIds } = query.search;
    const parts = [`t.note LIKE ? ESCAPE '${LIKE_ESCAPE}'`];
    params.push(likePattern(text));
    if (categoryIds.length > 0) {
      parts.push(`t.category_id IN (${placeholders(categoryIds.length)})`);
      params.push(...categoryIds);
    }
    clauses.push(`(${parts.join(' OR ')})`);
  }
  return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

/** SQL only — no business rules. Validation and money conversion live in transactionService. */
export const transactionRepository = {
  async insert(record: TransactionRecord, now: number = Date.now()): Promise<number> {
    const db = await getDatabase();
    const result = await db.runAsync(
      `INSERT INTO transactions
         (type, amount_minor, currency, category_id, occurred_on, note, payment_method, source,
          voice_transcript, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.type,
        record.amountMinor,
        record.currency,
        record.categoryId,
        record.occurredOn,
        record.note,
        record.paymentMethod,
        record.source,
        record.voiceTranscript ?? null,
        now,
        now,
      ],
    );
    return result.lastInsertRowId;
  },

  /**
   * Inserts and reads the stored row back in one transaction: if anything fails, nothing is
   * committed, so a "save failed" message never hides a saved row (no duplicate on retry).
   */
  async insertAndGet(record: TransactionRecord, now: number = Date.now()): Promise<Transaction> {
    const db = await getDatabase();
    const result: { created?: Transaction } = {};
    await db.withTransactionAsync(async () => {
      const id = await transactionRepository.insert(record, now);
      const row = await transactionRepository.getById(id);
      if (!row) throw new Error('Inserted transaction could not be read back');
      result.created = row;
    });
    if (!result.created) throw new Error('Inserted transaction could not be read back');
    return result.created;
  },

  /** Updates editable fields and `updated_at`. Returns false when the row no longer exists. */
  async update(
    id: number,
    input: TransactionRecordUpdate,
    now: number = Date.now(),
  ): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync(
      `UPDATE transactions
          SET type = ?, amount_minor = ?, category_id = ?, occurred_on = ?, note = ?,
              payment_method = ?, updated_at = ?
        WHERE id = ?`,
      [
        input.type,
        input.amountMinor,
        input.categoryId,
        input.occurredOn,
        input.note,
        input.paymentMethod,
        now,
        id,
      ],
    );
    return result.changes > 0;
  },

  /** Returns false when the row did not exist. */
  async remove(id: number): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
    return result.changes > 0;
  },

  async getById(id: number): Promise<Transaction | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<TransactionRow>(`${SELECT} WHERE t.id = ?`, [id]);
    return row ? mapRow(row) : null;
  },

  async list(query: TransactionQuery, page: Page): Promise<Transaction[]> {
    const db = await getDatabase();
    const { sql, params } = buildWhere(query);
    const dir = query.sort === 'oldest' ? 'ASC' : 'DESC';
    const rows = await db.getAllAsync<TransactionRow>(
      `${SELECT} ${sql}
       ORDER BY t.occurred_on ${dir}, t.created_at ${dir}, t.id ${dir}
       LIMIT ? OFFSET ?`,
      [...params, page.limit, page.offset],
    );
    return rows.map(mapRow);
  },

  /** Integer sums per type for an inclusive date range, in one currency. */
  async getTotalsByType(
    dateFrom: IsoDate,
    dateTo: IsoDate,
    currency: CurrencyCode,
  ): Promise<Record<TransactionType, MinorAmount>> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ type: TransactionType; total: number }>(
      `SELECT type, COALESCE(SUM(amount_minor), 0) AS total
         FROM transactions
        WHERE occurred_on BETWEEN ? AND ? AND currency = ?
        GROUP BY type`,
      [dateFrom, dateTo, currency],
    );
    const totals: Record<TransactionType, MinorAmount> = { income: 0, expense: 0 };
    for (const row of rows) totals[row.type] = row.total;
    return totals;
  },
};

export type TransactionRecordUpdate = Omit<
  TransactionRecord,
  'source' | 'currency' | 'voiceTranscript'
>;
