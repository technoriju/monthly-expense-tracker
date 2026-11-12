import { MAX_AMOUNT_MINOR } from '@/utils/money';

import {
  getSchemaVersion,
  runMigrations,
  validateMigrations,
  type MigrationDatabase,
} from '../migrate';
import { MIGRATIONS, type Migration } from '../migrations';
import { createMigratedTestDatabase } from '../testing/createTestDatabase';

/**
 * In-memory fake of the expo-sqlite methods the runner uses. Records executed SQL and
 * emulates PRAGMA user_version + transaction rollback.
 */
function createFakeDb(initialVersion = 0) {
  let committedVersion = initialVersion;
  let txVersion: number | null = null;
  const executed: string[] = [];

  const db = {
    executed,
    get version() {
      return committedVersion;
    },
    async getFirstAsync<T>(sql: string): Promise<T | null> {
      if (sql === 'PRAGMA user_version') {
        return { user_version: txVersion ?? committedVersion } as T;
      }
      return null;
    },
    async execAsync(sql: string): Promise<void> {
      executed.push(sql);
      const match = /PRAGMA user_version = (\d+)/.exec(sql);
      if (match) txVersion = Number(match[1]);
    },
    async runAsync() {
      return { changes: 0, lastInsertRowId: 0 };
    },
    async withTransactionAsync(task: () => Promise<void>): Promise<void> {
      txVersion = committedVersion;
      try {
        await task();
        committedVersion = txVersion;
      } finally {
        txVersion = null;
      }
    },
  };
  return db as typeof db & MigrationDatabase;
}

const m = (version: number, up: Migration['up'] = async () => {}): Migration => ({
  version,
  name: `m${version}`,
  up,
});

describe('runMigrations', () => {
  it('applies all migrations on a fresh database and bumps user_version', async () => {
    const db = createFakeDb();
    const result = await runMigrations(db, [m(1), m(2)]);
    expect(result).toEqual({ fromVersion: 0, toVersion: 2, applied: ['m1', 'm2'] });
    expect(db.version).toBe(2);
  });

  it('only applies pending migrations', async () => {
    const db = createFakeDb(1);
    const first = jest.fn(async () => {});
    const second = jest.fn(async () => {});
    const result = await runMigrations(db, [m(1, first), m(2, second)]);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(result.applied).toEqual(['m2']);
  });

  it('is a no-op when up to date', async () => {
    const db = createFakeDb(2);
    const result = await runMigrations(db, [m(1), m(2)]);
    expect(result.applied).toEqual([]);
    expect(db.executed).toEqual([]);
  });

  it('rolls back the version when a migration fails', async () => {
    const db = createFakeDb();
    const failing = m(2, async () => {
      throw new Error('boom');
    });
    await expect(runMigrations(db, [m(1), failing])).rejects.toThrow('boom');
    expect(db.version).toBe(1);
  });

  it('refuses a database newer than the app', async () => {
    const db = createFakeDb(5);
    await expect(runMigrations(db, [m(1)])).rejects.toThrow(/newer than this app/);
  });
});

describe('validateMigrations', () => {
  it('rejects gaps, duplicates and wrong order', () => {
    expect(() => validateMigrations([m(1), m(3)])).toThrow();
    expect(() => validateMigrations([m(1), m(1)])).toThrow();
    expect(() => validateMigrations([m(2), m(1)])).toThrow();
  });

  it('accepts the shipped migration list', () => {
    expect(() => validateMigrations(MIGRATIONS)).not.toThrow();
  });
});

describe('migration 001', () => {
  it('creates the categories, transactions and settings tables', async () => {
    const db = createFakeDb();
    await runMigrations(db, MIGRATIONS);
    const sql = db.executed.join('\n');
    expect(sql).toMatch(/CREATE TABLE categories/);
    expect(sql).toMatch(/CREATE TABLE transactions/);
    expect(sql).toMatch(/amount_minor\s+INTEGER NOT NULL CHECK \(amount_minor > 0\)/);
    expect(sql).toMatch(/CREATE TABLE settings/);
  });
});

describe('migration 002', () => {
  it('adds payment_method and indexes', async () => {
    const db = createFakeDb(1);
    const result = await runMigrations(db, MIGRATIONS);
    expect(result.applied).toEqual(['transactions_v2', 'budgets', 'amount_guards']);
    const sql = db.executed.join('\n');
    expect(sql).toMatch(/ALTER TABLE transactions ADD COLUMN payment_method TEXT/);
    expect(sql).toMatch(/CREATE INDEX idx_categories_type/);
  });
});

describe('migration 003', () => {
  it('creates budgets with unique indexes and triggers', async () => {
    const db = createFakeDb(2);
    const result = await runMigrations(db, MIGRATIONS.slice(0, 3));
    expect(result.applied).toEqual(['budgets']);
    const sql = db.executed.join('\n');
    expect(sql).toMatch(/CREATE TABLE budgets/);
    expect(sql).toMatch(/amount_minor\s+INTEGER NOT NULL CHECK \(amount_minor > 0\)/);
    expect(sql).toMatch(/CREATE UNIQUE INDEX ux_budgets_overall/);
    expect(sql).toMatch(/CREATE UNIQUE INDEX ux_budgets_category/);
    expect(sql).toMatch(/CREATE TRIGGER trg_budgets_expense_category_insert/);
    expect(await getSchemaVersion(db)).toBe(3);
  });
});

describe('migration 004', () => {
  it('adds amount guard triggers and the budget month index, ending at the latest version', async () => {
    const db = createFakeDb(3);
    const result = await runMigrations(db, MIGRATIONS);
    expect(result.applied).toEqual(['amount_guards']);
    const sql = db.executed.join('\n');
    expect(sql).toMatch(/CREATE TRIGGER trg_transactions_amount_insert/);
    expect(sql).toMatch(/CREATE TRIGGER trg_budgets_amount_update/);
    expect(sql).toMatch(/CREATE INDEX idx_budgets_month_currency/);
    expect(await getSchemaVersion(db)).toBe(4);
  });

  it('rejects non-integer and out-of-range amounts in real SQL', async () => {
    const db = await createMigratedTestDatabase();
    const category = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM categories WHERE type = 'expense' LIMIT 1",
    );
    const insertTx = (amount: unknown) =>
      db.runAsync(
        `INSERT INTO transactions (type, amount_minor, currency, category_id, occurred_on,
           source, created_at, updated_at)
         VALUES ('expense', ?, 'INR', ?, '2026-01-01', 'manual', 0, 0)`,
        [amount as number, category!.id],
      );
    await expect(insertTx(1.5)).rejects.toThrow(/amount_minor_invalid/);
    await expect(insertTx('abc')).rejects.toThrow(/amount_minor_invalid/);
    await expect(insertTx(MAX_AMOUNT_MINOR + 1)).rejects.toThrow(/amount_minor_invalid/);
    const ok = await insertTx(MAX_AMOUNT_MINOR);
    await expect(
      db.runAsync('UPDATE transactions SET amount_minor = ? WHERE id = ?', [
        2.5,
        ok.lastInsertRowId,
      ]),
    ).rejects.toThrow(/amount_minor_invalid/);

    const insertBudget = (amount: unknown) =>
      db.runAsync(
        `INSERT INTO budgets (budget_type, category_id, amount_minor, currency, month,
           created_at, updated_at)
         VALUES ('overall', NULL, ?, 'INR', '2026-01', 0, 0)`,
        [amount as number],
      );
    await expect(insertBudget(10.25)).rejects.toThrow(/amount_minor_invalid/);
    await expect(insertBudget(MAX_AMOUNT_MINOR)).resolves.toBeDefined();
    db.close();
  });
});
