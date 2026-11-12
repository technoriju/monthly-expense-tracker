import { useEffect, useState } from 'react';

import type { TransactionType } from '@/types/money';

import { categoryService } from '../services/categoryService';
import type { Category } from '../types';

export interface CategoriesState {
  categories: Category[];
  loading: boolean;
  error: boolean;
  /** Loads the list again (after an error). */
  retry(): void;
}

interface Loaded {
  key: string;
  categories: Category[];
  error: boolean;
}

/** Active categories of one type (`type`), or of every type when omitted. */
export function useCategories(type?: TransactionType): CategoriesState {
  const [attempt, setAttempt] = useState(0);
  const key = `${type ?? 'all'}:${attempt}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let cancelled = false;
    (type ? categoryService.listByType(type) : categoryService.listAll())
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

  const current = loaded?.key === key ? loaded : null;
  return {
    categories: current?.categories ?? [],
    loading: current === null,
    error: current?.error ?? false,
    retry: () => setAttempt((n) => n + 1),
  };
}
