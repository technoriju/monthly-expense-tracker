import { categoryRepository } from '@/database';
import type { TransactionType } from '@/types/money';

import type { Category } from '../types';

export const categoryService = {
  listByType(type: TransactionType): Promise<Category[]> {
    return categoryRepository.listByType(type);
  },

  listAll(): Promise<Category[]> {
    return categoryRepository.listAll();
  },

  getById(id: number): Promise<Category | null> {
    return categoryRepository.getById(id);
  },
};
