/**
 * TEST-ONLY: an in-memory SQLite database (Node's built-in `node:sqlite`) exposing the
 * subset of the expo-sqlite async API our repositories and migrations use, so repository
 * tests run real SQL in Jest. Never import from app code.
 */
import type { SQLiteBindValue, SQLiteDatabase, SQLiteRunResult } from 'expo-sqlite';

import { runMigrations } from '../migrate';
import { MIGRATIONS } from '../migrations';
import { seedSystemCategories } from '../seed/seedSystemCategories';

interface NodeStatement {
  run(...params: SQLiteBindValue[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  get(...params: SQLiteBindValue[]): unknown;
  all(...params: SQLiteBindValue[]): unknown[];
}

interface NodeDatabase {
  exec(sql: string): void;
  prepare(sql: string): NodeStatement;
  close(): void;
}

type TestDatabaseApi = Pick<
  SQLiteDatabase,
  | 'execAsync'
  | 'runAsync'
  | 'getFirstAsync'
  | 'getAllAsync'
  | 'withTransactionAsync'
  | 'withExclusiveTransactionAsync'
>;

export type TestDatabase = TestDatabaseApi & { close(): void };

export function createTestDatabase(): TestDatabase {
  // `node:sqlite` has no typings in this RN project (no @types/node in tsconfig `types`).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DatabaseSync } = require('node:sqlite') as {
    DatabaseSync: new (path: string) => NodeDatabase;
  };
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');

  const params = (args: unknown[]): SQLiteBindValue[] =>
    (Array.isArray(args[0]) ? args[0] : args) as SQLiteBindValue[];

  const api = {
    async execAsync(sql: string) {
      db.exec(sql);
    },
    async runAsync(sql: string, ...args: unknown[]): Promise<SQLiteRunResult> {
      const r = db.prepare(sql).run(...params(args));
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    async getFirstAsync(sql: string, ...args: unknown[]) {
      return db.prepare(sql).get(...params(args)) ?? null;
    },
    async getAllAsync(sql: string, ...args: unknown[]) {
      return db.prepare(sql).all(...params(args));
    },
    async withTransactionAsync(task: () => Promise<void>) {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    // One in-memory connection: the "exclusive" transaction runs on it and passes itself.
    async withExclusiveTransactionAsync(task: (txn: unknown) => Promise<void>) {
      await api.withTransactionAsync(() => task(api));
    },
    close: () => db.close(),
  };
  // The overloaded expo-sqlite signatures can't be expressed by plain functions; the runtime
  // behaviour matches for the array-params form our repositories use.
  return api as unknown as TestDatabase;
}

/** Fresh in-memory DB with every migration applied and system categories seeded. */
export async function createMigratedTestDatabase(): Promise<TestDatabase> {
  const db = createTestDatabase();
  await runMigrations(db, MIGRATIONS);
  await seedSystemCategories(db);
  return db;
}
