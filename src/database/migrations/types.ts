import type { SQLiteDatabase } from 'expo-sqlite';

/** Subset of the database API a migration may use. */
export type MigrationExecutor = Pick<SQLiteDatabase, 'execAsync' | 'runAsync'>;

export interface Migration {
  /** 1-based, contiguous, append-only. Never edit a shipped migration. */
  version: number;
  name: string;
  up(db: MigrationExecutor): Promise<void>;
}
