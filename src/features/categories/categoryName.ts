import type { TFunction } from 'i18next';

import { englishResources } from '@/i18n/resources';

import type { Category, CategoryKey } from './types';

export function isCategoryKey(key: string): key is CategoryKey {
  return Object.prototype.hasOwnProperty.call(englishResources.categories, key);
}

/** Display name for a category: translated system name, else the raw key. */
export function getCategoryName(
  t: TFunction<'categories'>,
  category: Pick<Category, 'key'>,
): string {
  return isCategoryKey(category.key) ? t(category.key) : category.key;
}
