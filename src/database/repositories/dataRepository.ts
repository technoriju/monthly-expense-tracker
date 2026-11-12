import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  BudgetSnapshot,
  CategorySnapshot,
  DataCounts,
  DataSnapshot,
  DataTables,
  TransactionSnapshot,
} from '@/features/data-management/types';

import { getDatabase } from '../client';
import { insertMissingSystemCategories } from '../seed/seedSystemCategories';

type Executor = Pick<SQLiteDatabase, 'runAsync' | 'getAllAsync' | 'getFirstAsync'>;

interface CategoryRow {
  id: number;
  key: string;
  type: CategorySnapshot['type'];
  icon: string;
  color: string;
  sort_order: number;
  is_system: number;
  is_archived: number;
  custom_name: string | null;
  created_at: number;
}

interface TransactionRow {
  id: number;
  type: TransactionSnapshot['type'];
  amount_minor: number;
  currency: TransactionSnapshot['currency'];
  category_id: number;
  occurred_on: string;
  note: string | null;
  payment_method: TransactionSnapshot['paymentMethod'];
  source: TransactionSnapshot['source'];
  voice_transcript: string | null;
  created_at: number;
  updated_at: number;
}

interface BudgetRow {
  id: number;
  budget_type: BudgetSnapshot['budgetType'];
  category_id: number | null;
  amount_minor: number;
  currency: BudgetSnapshot['currency'];
  month: string;
  created_at: number;
  updated_at: number;
}

/**
 * Runs `task` in an exclusive transaction on its own connection, so no other query can
 * interleave. Foreign keys are a per-connection setting (and cannot be switched on inside a
 * transaction), so integrity is checked explicitly before commit; any error rolls back.
 */
async function inExclusiveTransaction(task: (txn: Executor) => Promise<void>): Promise<void> {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (txn) => {
    await task(txn);
    const violation = await txn.getFirstAsync<{ table: string }>('PRAGMA foreign_key_check');
    if (violation) throw new Error(`Foreign key violation in ${violation.table}`);
  });
}

async function readTables(db: Executor): Promise<DataTables> {
  const categories = await db.getAllAsync<CategoryRow>(
    `SELECT id, key, type, icon, color, sort_order, is_system, is_archived, custom_name, created_at
       FROM categories ORDER BY id`,
  );
  const transactions = await db.getAllAsync<TransactionRow>(
    `SELECT id, type, amount_minor, currency, category_id, occurred_on, note, payment_method,
            source, voice_transcript, created_at, updated_at
       FROM transactions ORDER BY id`,
  );
  const budgets = await db.getAllAsync<BudgetRow>(
    `SELECT id, budget_type, category_id, amount_minor, currency, month, created_at, updated_at
       FROM budgets ORDER BY id`,
  );
  return {
    categories: categories.map((r) => ({
      id: r.id,
      key: r.key,
      type: r.type,
      icon: r.icon,
      color: r.color,
      sortOrder: r.sort_order,
      isSystem: r.is_system === 1,
      isArchived: r.is_archived === 1,
      customName: r.custom_name,
      createdAt: r.created_at,
    })),
    transactions: transactions.map((r) => ({
      id: r.id,
      type: r.type,
      amountMinor: r.amount_minor,
      currency: r.currency,
      categoryId: r.category_id,
      occurredOn: r.occurred_on,
      note: r.note,
      paymentMethod: r.payment_method,
      source: r.source,
      voiceTranscript: r.voice_transcript,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
    budgets: budgets.map((r) => ({
      id: r.id,
      budgetType: r.budget_type,
      categoryId: r.category_id,
      amountMinor: r.amount_minor,
      currency: r.currency,
      month: r.month,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
  };
}

async function deleteUserData(db: Executor): Promise<void> {
  // Children first: budgets and transactions reference categories.
  await db.runAsync('DELETE FROM budgets');
  await db.runAsync('DELETE FROM transactions');
}

/**
 * Whole-database operations for backup, restore and reset. SQL only — validation of the
 * data happens before it gets here (data-management services).
 */
export const dataRepository = {
  /** Consistent copy of every user table and the schema version. */
  async exportSnapshot(): Promise<DataSnapshot> {
    let snapshot: DataSnapshot | null = null;
    await inExclusiveTransaction(async (txn) => {
      const tables = await readTables(txn);
      const version = await txn.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      snapshot = { ...tables, databaseVersion: version?.user_version ?? 0 };
    });
    // Assigned inside the committed transaction above.
    return snapshot as unknown as DataSnapshot;
  },

  async counts(): Promise<DataCounts> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<DataCounts>(
      `SELECT (SELECT COUNT(*) FROM transactions) AS transactions,
              (SELECT COUNT(*) FROM categories WHERE is_archived = 0) AS categories,
              (SELECT COUNT(*) FROM budgets) AS budgets`,
    );
    return row ?? { transactions: 0, categories: 0, budgets: 0 };
  },

  /**
   * Full replacement: deletes all transactions, budgets and categories, inserts `tables` with
   * their original ids (keeping every relationship), re-adds any missing system category and
   * upserts `settings`. All or nothing — on any error the previous data stays untouched.
   */
  async replaceAll(
    tables: DataTables,
    settings: Record<string, unknown>,
    now: number = Date.now(),
  ): Promise<void> {
    await inExclusiveTransaction(async (txn) => {
      await deleteUserData(txn);
      await txn.runAsync('DELETE FROM categories');
      for (const c of tables.categories) {
        await txn.runAsync(
          `INSERT INTO categories
             (id, key, type, icon, color, sort_order, is_system, is_archived, custom_name, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            c.id,
            c.key,
            c.type,
            c.icon,
            c.color,
            c.sortOrder,
            c.isSystem ? 1 : 0,
            c.isArchived ? 1 : 0,
            c.customName,
            c.createdAt,
          ],
        );
      }
      await insertMissingSystemCategories(txn, now);
      for (const t of tables.transactions) {
        await txn.runAsync(
          `INSERT INTO transactions
             (id, type, amount_minor, currency, category_id, occurred_on, note, payment_method,
              source, voice_transcript, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            t.id,
            t.type,
            t.amountMinor,
            t.currency,
            t.categoryId,
            t.occurredOn,
            t.note,
            t.paymentMethod,
            t.source,
            t.voiceTranscript,
            t.createdAt,
            t.updatedAt,
          ],
        );
      }
      for (const b of tables.budgets) {
        await txn.runAsync(
          `INSERT INTO budgets
             (id, budget_type, category_id, amount_minor, currency, month, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            b.id,
            b.budgetType,
            b.categoryId,
            b.amountMinor,
            b.currency,
            b.month,
            b.createdAt,
            b.updatedAt,
          ],
        );
      }
      for (const [key, value] of Object.entries(settings)) {
        await txn.runAsync(
          'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
          [key, JSON.stringify(value)],
        );
      }
    });
  },

  /**
   * Deletes every transaction and budget and any user-created category, then re-adds missing
   * system categories. Settings are kept.
   */
  async clearUserData(now: number = Date.now()): Promise<void> {
    await inExclusiveTransaction(async (txn) => {
      await deleteUserData(txn);
      await txn.runAsync('DELETE FROM categories WHERE is_system = 0');
      await insertMissingSystemCategories(txn, now);
    });
  },
};
