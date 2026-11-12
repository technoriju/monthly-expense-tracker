import { categoryRepository } from '@/database';
import { i18n } from '@/i18n';
import { useUiStore } from '@/store/uiStore';
import type { TransactionType } from '@/types/money';

import { getCategoryName } from '../categoryName';
import type { Category } from '../types';

export const CATEGORY_NAME_MAX_LENGTH = 30;

export type CategoryErrorCode = 'nameRequired' | 'nameTooLong' | 'duplicate' | 'notFound';

export class CategoryError extends Error {
  constructor(readonly code: CategoryErrorCode) {
    super(`Category error: ${code}`);
    this.name = 'CategoryError';
  }
}

/**
 * Trimmed, whitespace-collapsed name, unique (case-insensitive) among the type's categories
 * as displayed in the active UI language. `exceptId` is the category being renamed.
 */
async function validName(
  type: TransactionType,
  rawName: string,
  exceptId?: number,
): Promise<string> {
  const name = rawName.trim().replace(/\s+/g, ' ');
  if (!name) throw new CategoryError('nameRequired');
  if (name.length > CATEGORY_NAME_MAX_LENGTH) throw new CategoryError('nameTooLong');

  const t = i18n.getFixedT(null, 'categories');
  const needle = name.toLocaleLowerCase();
  const existing = await categoryRepository.listByType(type);
  if (
    existing.some(
      (c) => c.id !== exceptId && getCategoryName(t, c).toLocaleLowerCase() === needle,
    )
  ) {
    throw new CategoryError('duplicate');
  }
  return name;
}

export const categoryService = {
  listByType(type: TransactionType): Promise<Category[]> {
    return categoryRepository.listByType(type);
  },

  /** Active categories of one type, most used first. */
  listByTypeByUsage(type: TransactionType): Promise<Category[]> {
    return categoryRepository.listByTypeByUsage(type);
  },

  listAll(): Promise<Category[]> {
    return categoryRepository.listAll();
  },

  getById(id: number): Promise<Category | null> {
    return categoryRepository.getById(id);
  },

  /**
   * Creates a user category. The name is trimmed and must be unique (case-insensitive)
   * among the type's categories as displayed in the active UI language.
   */
  async createCustom(type: TransactionType, rawName: string): Promise<Category> {
    const name = await validName(type, rawName);
    const created = await categoryRepository.createCustom(type, name);
    useUiStore.getState().bumpDataVersion();
    return created;
  },

  /**
   * Renames a user category (same name rules as `createCustom`). Past transactions show the
   * new name. System categories cannot be renamed.
   */
  async renameCustom(category: Category, rawName: string): Promise<Category> {
    const name = await validName(category.type, rawName, category.id);
    const updated = await categoryRepository.renameCustom(category.id, name);
    if (!updated) throw new CategoryError('notFound');
    useUiStore.getState().bumpDataVersion();
    return updated;
  },

  /**
   * Removes a user category from the lists (soft delete). Past transactions keep it and its
   * name. System categories cannot be deleted.
   */
  async deleteCustom(id: number): Promise<void> {
    if (await categoryRepository.archiveCustom(id)) useUiStore.getState().bumpDataVersion();
  },
};
