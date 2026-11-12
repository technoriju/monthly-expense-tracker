import type { TransactionType } from '@/types/money';

import type { Category } from './types';

/** Categories shown as their own tiles (row 1: 4, row 2: 2, then Other + Add). */
export const QUICK_CATEGORY_COUNT = 6;

export interface QuickCategories {
  /** Most used categories (input order), excluding the type's "Other" category. */
  quick: Category[];
  /** The type's "Other" system category (`other_expense` / `other_income`). */
  other: Category | null;
}

/** Splits a usage-ordered list into the quick tiles and the "Other" category. */
export function splitQuickCategories(
  categories: readonly Category[],
  type: TransactionType,
): QuickCategories {
  const otherKey = `other_${type}`;
  return {
    quick: categories.filter((c) => c.key !== otherKey).slice(0, QUICK_CATEGORY_COUNT),
    other: categories.find((c) => c.key === otherKey) ?? null,
  };
}
