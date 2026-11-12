import { useEffect, useState } from 'react';

import type { TransactionType } from '@/types/money';

import { categoryService } from '../services/categoryService';
import type { Category } from '../types';
import type { CategoriesState } from './useCategories';

export interface CategoriesByUsageState extends CategoriesState {
  /** Creates a custom category of `type` and appends it to the list. Throws `CategoryError`. */
  addCategory(name: string): Promise<Category>;
}

interface Loaded {
  key: string;
  categories: Category[];
  error: boolean;
}

/** Active categories of one type, most used first, plus custom-category creation. */
export function useCategoriesByUsage(type: TransactionType): CategoriesByUsageState {
  const [attempt, setAttempt] = useState(0);
  const key = `${type}:${attempt}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let cancelled = false;
    categoryService
      .listByTypeByUsage(type)
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

  const addCategory = async (name: string) => {
    const created = await categoryService.createCustom(type, name);
    // Unused, so it ranks last: append instead of reloading (no loading flash).
    setLoaded((prev) =>
      prev?.key === key ? { ...prev, categories: [...prev.categories, created] } : prev,
    );
    return created;
  };

  const current = loaded?.key === key ? loaded : null;
  return {
    categories: current?.categories ?? [],
    loading: current === null,
    error: current?.error ?? false,
    retry: () => setAttempt((n) => n + 1),
    addCategory,
  };
}
