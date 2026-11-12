import type { Category } from '@/features/categories/types';
import type { TransactionType } from '@/types/money';

import { getDatabase } from '../client';
import { seedSystemCategories } from '../seed/seedSystemCategories';

export interface CategoryRow {
  id: number;
  key: string;
  type: TransactionType;
  icon: string;
  color: string;
  sort_order: number;
  is_system: number;
  custom_name: string | null;
  created_at: number;
}

const COLUMNS = 'id, key, type, icon, color, sort_order, is_system, custom_name, created_at';

/** Icon and tone for user-created categories (see `CATEGORY_ICONS` / `CATEGORY_TONES`). */
const CUSTOM_ICON = 'Tag';
const CUSTOM_COLOR = 'primary';

export function mapCategoryRow(row: CategoryRow): Category {
  return {
    id: row.id,
    key: row.key,
    type: row.type,
    icon: row.icon,
    color: row.color,
    sortOrder: row.sort_order,
    isDefault: row.is_system === 1,
    customName: row.custom_name,
    createdAt: row.created_at,
  };
}

export const categoryRepository = {
  /** Idempotent system-category seed (also run automatically on database open). */
  async seedSystemCategories(now: number = Date.now()): Promise<number> {
    return seedSystemCategories(await getDatabase(), now);
  },

  async listByType(type: TransactionType): Promise<Category[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<CategoryRow>(
      `SELECT ${COLUMNS} FROM categories WHERE type = ? AND is_archived = 0 ORDER BY sort_order, id`,
      [type],
    );
    return rows.map(mapCategoryRow);
  },

  async listAll(): Promise<Category[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<CategoryRow>(
      `SELECT ${COLUMNS} FROM categories WHERE is_archived = 0 ORDER BY type, sort_order, id`,
    );
    return rows.map(mapCategoryRow);
  },

  /**
   * Active categories of one type, most used first (all-time transaction count),
   * then by `sort_order`.
   */
  async listByTypeByUsage(type: TransactionType): Promise<Category[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<CategoryRow>(
      `SELECT ${COLUMNS},
              (SELECT COUNT(*) FROM transactions t WHERE t.category_id = categories.id) AS usage
         FROM categories
        WHERE type = ? AND is_archived = 0
        ORDER BY usage DESC, sort_order, id`,
      [type],
    );
    return rows.map(mapCategoryRow);
  },

  /** Inserts a user-created category at the end of its type's list. */
  async createCustom(
    type: TransactionType,
    name: string,
    now: number = Date.now(),
  ): Promise<Category> {
    const db = await getDatabase();
    const key = `custom_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const result = await db.runAsync(
      `INSERT INTO categories (key, type, icon, color, sort_order, is_system, custom_name, created_at)
       VALUES (?, ?, ?, ?,
               (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM categories WHERE type = ?),
               0, ?, ?)`,
      [key, type, CUSTOM_ICON, CUSTOM_COLOR, type, name, now],
    );
    const created = await categoryRepository.getById(result.lastInsertRowId);
    if (!created) throw new Error('Created category not found');
    return created;
  },

  /**
   * Hides a user-created category from every list. Existing transactions keep pointing at it.
   * System categories are never archived. Returns whether a row changed.
   */
  async archiveCustom(id: number): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync(
      'UPDATE categories SET is_archived = 1 WHERE id = ? AND is_system = 0 AND is_archived = 0',
      [id],
    );
    return result.changes > 0;
  },

  async getById(id: number): Promise<Category | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<CategoryRow>(
      `SELECT ${COLUMNS} FROM categories WHERE id = ?`,
      [id],
    );
    return row ? mapCategoryRow(row) : null;
  },
};
