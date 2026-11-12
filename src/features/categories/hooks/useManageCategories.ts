import { useEffect, useState } from 'react';

import type { TransactionType } from '@/types/money';

import { categoryService } from '../services/categoryService';
import type { Category } from '../types';
import type { CategoriesState } from './useCategories';

export interface ManageCategoriesState extends CategoriesState {
  /** Creates a custom category of `type` and appends it. Throws `CategoryError`. */
  addCategory(name: string): Promise<Category>;
  /** Soft-deletes a custom category and removes it from the list. */
  deleteCategory(id: number): Promise<void>;
}

interface Loaded {
  key: string;
  categories: Category[];
  error: boolean;
}

/** Active categories of one type in list order, with add/delete of custom categories. */
export function useManageCategories(type: TransactionType): ManageCategoriesState {
  const [attempt, setAttempt] = useState(0);
  const key = `${type}:${attempt}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let cancelled = false;
    categoryService
      .listByType(type)
      .then((categories) => {
        if (!cancelled) setLoaded({ key, categories, error: false });
      })
      .catch((error: unknown) => {
        console.error('Failed to load categories', error);
        if (!cancelled) setLoaded({ key, categories: [], error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [key, type]);

  const update = (fn: (categories: Category[]) => Category[]) =>
    setLoaded((prev) => (prev?.key === key ? { ...prev, categories: fn(prev.categories) } : prev));

  const addCategory = async (name: string) => {
    const created = await categoryService.createCustom(type, name);
    update((categories) => [...categories, created]);
    return created;
  };

  const deleteCategory = async (id: number) => {
    await categoryService.deleteCustom(id);
    update((categories) => categories.filter((c) => c.id !== id));
  };

  const current = loaded?.key === key ? loaded : null;
  return {
    categories: current?.categories ?? [],
    loading: current === null,
    error: current?.error ?? false,
    retry: () => setAttempt((n) => n + 1),
    addCategory,
    deleteCategory,
  };
}
