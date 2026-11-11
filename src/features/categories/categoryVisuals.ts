import { ShoppingBasket, Store, Wallet, type LucideIcon } from 'lucide-react-native';

import type { TextColorToken } from '@/components/ui';

import type { CategoryKey } from './types';

export type CategoryTone = 'accent' | 'expense' | 'income' | 'info' | 'primary';

export interface CategoryVisual {
  icon: LucideIcon;
  tone: CategoryTone;
}

/** Tone → (pastel background, icon color) theme tokens. */
export const CATEGORY_TONES: Record<
  CategoryTone,
  { background: TextColorToken; foreground: TextColorToken }
> = {
  accent: { background: 'accentSoft', foreground: 'accent' },
  expense: { background: 'expenseSoft', foreground: 'expense' },
  income: { background: 'incomeSoft', foreground: 'income' },
  info: { background: 'infoSoft', foreground: 'info' },
  primary: { background: 'primarySoft', foreground: 'primary' },
};

/**
 * Icon + tone per category key. Keys are identifiers (never translated).
 * Only keys used by the Phase 1 dashboard preview exist so far; the full system
 * category set arrives with transaction CRUD.
 */
const CATEGORY_VISUALS: Record<CategoryKey, CategoryVisual> = {
  bazar: { icon: ShoppingBasket, tone: 'accent' },
  dokan: { icon: Store, tone: 'expense' },
  salary: { icon: Wallet, tone: 'income' },
};

export function getCategoryVisual(key: CategoryKey): CategoryVisual {
  return CATEGORY_VISUALS[key];
}
