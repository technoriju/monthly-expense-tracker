import type { SQLiteDatabase } from 'expo-sqlite';

import { SYSTEM_CATEGORIES } from './systemCategories';

export type SeedDatabase = Pick<SQLiteDatabase, 'runAsync' | 'withTransactionAsync'>;

/**
 * Inserts any missing system categories in one transaction. Existing keys are left
 * untouched (`ON CONFLICT DO NOTHING`), so running this on every start never duplicates.
 * Returns the number of rows inserted.
 */
export async function seedSystemCategories(
  db: SeedDatabase,
  now: number = Date.now(),
): Promise<number> {
  let inserted = 0;
  await db.withTransactionAsync(async () => {
    for (const [index, c] of SYSTEM_CATEGORIES.entries()) {
      const result = await db.runAsync(
        `INSERT INTO categories (key, type, icon, color, sort_order, is_system, created_at)
         VALUES (?, ?, ?, ?, ?, 1, ?)
         ON CONFLICT(key) DO NOTHING`,
        [c.key, c.type, c.icon, c.color, index, now],
      );
      inserted += result.changes;
    }
  });
  return inserted;
}
