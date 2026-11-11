import { useTranslation } from 'react-i18next';

import { getCategoryName } from '../categoryName';
import type { Category } from '../types';

/** Returns a function translating a category to its display name in the UI language. */
export function useCategoryName(): (category: Pick<Category, 'key'>) => string {
  const { t } = useTranslation('categories');
  return (category) => getCategoryName(t, category);
}
