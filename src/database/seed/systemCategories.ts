import type { TransactionType } from '@/types/money';

/**
 * Built-in categories seeded on every start (idempotent). `key` is the stable identifier
 * (never translated; display name = i18n `categories:<key>`). `icon` is a Lucide icon name
 * and `color` a category tone token — both resolved to components/colors in the UI layer.
 *
 * Append new entries only; never rename a shipped key (transactions reference the row).
 */
export interface SystemCategoryDefinition {
  key: string;
  type: TransactionType;
  icon: string;
  color: string;
}

export const SYSTEM_CATEGORIES: readonly SystemCategoryDefinition[] = [
  // Expense
  { key: 'food', type: 'expense', icon: 'Utensils', color: 'accent' },
  { key: 'groceries', type: 'expense', icon: 'ShoppingCart', color: 'income' },
  { key: 'bazar', type: 'expense', icon: 'ShoppingBasket', color: 'accent' },
  { key: 'dokan', type: 'expense', icon: 'Store', color: 'expense' },
  { key: 'transportation', type: 'expense', icon: 'Bus', color: 'info' },
  { key: 'shopping', type: 'expense', icon: 'ShoppingBag', color: 'primary' },
  { key: 'bills', type: 'expense', icon: 'ReceiptText', color: 'expense' },
  { key: 'rent', type: 'expense', icon: 'House', color: 'accent' },
  { key: 'healthcare', type: 'expense', icon: 'HeartPulse', color: 'expense' },
  { key: 'education', type: 'expense', icon: 'GraduationCap', color: 'info' },
  { key: 'entertainment', type: 'expense', icon: 'Clapperboard', color: 'primary' },
  { key: 'travel', type: 'expense', icon: 'Plane', color: 'info' },
  { key: 'personal_care', type: 'expense', icon: 'Sparkles', color: 'primary' },
  { key: 'other_expense', type: 'expense', icon: 'Ellipsis', color: 'primary' },
  // Income
  { key: 'salary', type: 'income', icon: 'Wallet', color: 'income' },
  { key: 'freelance', type: 'income', icon: 'Laptop', color: 'info' },
  { key: 'business', type: 'income', icon: 'Briefcase', color: 'accent' },
  { key: 'investment', type: 'income', icon: 'TrendingUp', color: 'income' },
  { key: 'gift', type: 'income', icon: 'Gift', color: 'expense' },
  { key: 'other_income', type: 'income', icon: 'Ellipsis', color: 'primary' },
];
