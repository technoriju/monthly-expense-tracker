import type { CategoryKey } from '@/features/categories/types';
import type { MinorAmount, TransactionType } from '@/types/money';
import type { IsoDate } from '@/utils/dates';

/** Read-only shape used by list/preview rows. */
export interface TransactionPreview {
  id: string;
  type: TransactionType;
  amountMinor: MinorAmount;
  /** Category identifier — translated at display time via `categories:<key>`. */
  categoryKey: CategoryKey;
  occurredOn: IsoDate;
}
