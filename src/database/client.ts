import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { runMigrations, type MigrationResult } from './migrate';
import { MIGRATIONS } from './migrations';
import { seedSystemCategories } from './seed/seedSystemCategories';

export const DATABASE_NAME = 'expense-tracker.db';

let databasePromise: Promise<SQLiteDatabase> | null = null;
let lastMigration: MigrationResult | null = null;

async function openAndMigrate(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync(DATABASE_NAME);
  try {
    await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    lastMigration = await runMigrations(db, MIGRATIONS);
    await seedSystemCategories(db);
    return db;
  } catch (error) {
    // Don't leak this connection: a retry opens a fresh one.
    await db.closeAsync().catch(() => {});
    throw error;
  }
}

/**
 * Returns the single shared connection, opening and migrating it on first use.
 * Only repositories (inside src/database) may call this.
 */
export function getDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openAndMigrate().catch((error: unknown) => {
      databasePromise = null; // allow a retry on next call
      throw error;
    });
  }
  return databasePromise;
}

/** Opens the database and applies migrations. Called once during app bootstrap. */
export async function initializeDatabase(): Promise<MigrationResult> {
  await getDatabase();
  // lastMigration is always set once getDatabase() resolves.
  return lastMigration as MigrationResult;
}
