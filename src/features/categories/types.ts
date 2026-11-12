import type { TranslationResources } from '@/i18n/resources';
import type { TransactionType } from '@/types/money';

/**
 * System category identifiers. Stored as-is in the DB, never translated;
 * display names come from the `categories` i18n namespace.
 */
export type CategoryKey = keyof TranslationResources['categories'];

export interface Category {
  id: number;
  /** Stable identifier; translated via `categories:<key>` when it is a system category. */
  key: string;
  type: TransactionType;
  /** Lucide icon name. */
  icon: string;
  /** Category tone token (see `CATEGORY_TONES`). */
  color: string;
  sortOrder: number;
  isDefault: boolean;
  /** Name typed by the user for a custom category; `null` for system categories. */
  customName: string | null;
  createdAt: number;
}
