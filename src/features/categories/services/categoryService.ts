import { categoryRepository } from '@/database';
import { i18n } from '@/i18n';
import { useUiStore } from '@/store/uiStore';
import type { TransactionType } from '@/types/money';

import { getCategoryName } from '../categoryName';
import type { Category } from '../types';

export const CATEGORY_NAME_MAX_LENGTH = 30;

export type CategoryErrorCode = 'nameRequired' | 'nameTooLong' | 'duplicate';

export class CategoryError extends Error {
  constructor(readonly code: CategoryErrorCode) {
    super(`Category error: ${code}`);
    this.name = 'CategoryError';
  }
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
    const name = rawName.trim().replace(/\s+/g, ' ');
    if (!name) throw new CategoryError('nameRequired');
    if (name.length > CATEGORY_NAME_MAX_LENGTH) throw new CategoryError('nameTooLong');

    const t = i18n.getFixedT(null, 'categories');
    const needle = name.toLocaleLowerCase();
    const existing = await categoryRepository.listByType(type);
    if (existing.some((c) => getCategoryName(t, c).toLocaleLowerCase() === needle)) {
      throw new CategoryError('duplicate');
    }

    const created = await categoryRepository.createCustom(type, name);
    useUiStore.getState().bumpDataVersion();
    return created;
  },

  /**
   * Removes a user category from the lists (soft delete). Past transactions keep it and its
   * name. System categories cannot be deleted.
   */
  async deleteCustom(id: number): Promise<void> {
    if (await categoryRepository.archiveCustom(id)) useUiStore.getState().bumpDataVersion();
  },
};
