import type { SQLiteDatabase } from 'expo-sqlite';

import type { Migration } from './migrations';

/** Subset of the database API the migration runner needs (kept small for testability). */
export type MigrationDatabase = Pick<
  SQLiteDatabase,
  'getFirstAsync' | 'execAsync' | 'runAsync' | 'withTransactionAsync'
>;

export interface MigrationResult {
  fromVersion: number;
  toVersion: number;
  applied: string[];
}

/** Schema version is tracked with `PRAGMA user_version`. */
export async function getSchemaVersion(db: MigrationDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

/** Migrations must be numbered 1..n with no gaps or duplicates. */
export function validateMigrations(migrations: readonly Migration[]): void {
  migrations.forEach((m, index) => {
    if (!Number.isInteger(m.version) || m.version !== index + 1) {
      throw new Error(
        `Invalid migration order: expected version ${index + 1}, got ${m.version} (${m.name})`,
      );
    }
  });
}

/**
 * Applies every pending migration. Each migration and its `user_version` bump run in one
 * transaction, so a failure rolls back that migration and leaves the version untouched.
 */
export async function runMigrations(
  db: MigrationDatabase,
  migrations: readonly Migration[],
): Promise<MigrationResult> {
  validateMigrations(migrations);
  const fromVersion = await getSchemaVersion(db);
  const latest = migrations.length;

  if (fromVersion > latest) {
    throw new Error(
      `Database schema version ${fromVersion} is newer than this app supports (${latest}).`,
    );
  }

  const pending = migrations.slice(fromVersion);
  for (const migration of pending) {
    await db.withTransactionAsync(async () => {
      await migration.up(db);
      // `version` is a validated integer from code, never user input.
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }

  return { fromVersion, toVersion: latest, applied: pending.map((m) => m.name) };
}
