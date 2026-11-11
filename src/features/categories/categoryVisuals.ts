import {
  Briefcase,
  Bus,
  Clapperboard,
  Ellipsis,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Laptop,
  Plane,
  ReceiptText,
  ShoppingBag,
  ShoppingBasket,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingUp,
  Utensils,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';

import type { TextColorToken } from '@/components/ui';

import type { Category } from './types';

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
 * Lucide icon name (as stored in `categories.icon`) → component. Every icon used by
 * `database/seed/systemCategories.ts` must be listed here (enforced by unit test).
 */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Briefcase,
  Bus,
  Clapperboard,
  Ellipsis,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Laptop,
  Plane,
  ReceiptText,
  ShoppingBag,
  ShoppingBasket,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingUp,
  Utensils,
  Wallet,
};

const FALLBACK: CategoryVisual = { icon: Ellipsis, tone: 'primary' };

function isTone(value: string): value is CategoryTone {
  return value in CATEGORY_TONES;
}

/** Resolves the stored icon name + color token, falling back for unknown values. */
export function getCategoryVisual(category: Pick<Category, 'icon' | 'color'>): CategoryVisual {
  return {
    icon: CATEGORY_ICONS[category.icon] ?? FALLBACK.icon,
    tone: isTone(category.color) ? category.color : FALLBACK.tone,
  };
}
