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
  created_at: number;
}

const COLUMNS = 'id, key, type, icon, color, sort_order, is_system, created_at';

export function mapCategoryRow(row: CategoryRow): Category {
  return {
    id: row.id,
    key: row.key,
    type: row.type,
    icon: row.icon,
    color: row.color,
    sortOrder: row.sort_order,
    isDefault: row.is_system === 1,
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

  async getById(id: number): Promise<Category | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<CategoryRow>(
      `SELECT ${COLUMNS} FROM categories WHERE id = ?`,
      [id],
    );
    return row ? mapCategoryRow(row) : null;
  },
};
