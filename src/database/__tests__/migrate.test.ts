import {
  getSchemaVersion,
  runMigrations,
  validateMigrations,
  type MigrationDatabase,
} from '../migrate';
import { MIGRATIONS, type Migration } from '../migrations';

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
  it('adds payment_method and indexes, ending at the latest version', async () => {
    const db = createFakeDb(1);
    const result = await runMigrations(db, MIGRATIONS);
    expect(result.applied).toEqual(['transactions_v2']);
    const sql = db.executed.join('\n');
    expect(sql).toMatch(/ALTER TABLE transactions ADD COLUMN payment_method TEXT/);
    expect(sql).toMatch(/CREATE INDEX idx_categories_type/);
    expect(await getSchemaVersion(db)).toBe(2);
  });
});
