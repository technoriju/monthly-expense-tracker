import type { Category } from '@/features/categories/types';
import type { CurrencyCode, MinorAmount, PaymentMethod, TransactionType } from '@/types/money';
import type { IsoDate } from '@/utils/dates';

export type TransactionSource = 'manual' | 'voice';

export interface Transaction {
  id: number;
  type: TransactionType;
  /** Integer minor units (paise). Always > 0; the sign comes from `type`. */
  amountMinor: MinorAmount;
  currency: CurrencyCode;
  categoryId: number;
  category: Category;
  /** Local calendar date 'YYYY-MM-DD'. */
  occurredOn: IsoDate;
  note: string | null;
  paymentMethod: PaymentMethod | null;
  source: TransactionSource;
  createdAt: number;
  updatedAt: number;
}

/** Validated values a transaction is created/updated from. */
export interface TransactionInput {
  type: TransactionType;
  amountMinor: MinorAmount;
  categoryId: number;
  occurredOn: IsoDate;
  note: string | null;
  paymentMethod: PaymentMethod | null;
}

/** Fields the repository persists on insert. */
export interface TransactionRecord extends TransactionInput {
  currency: CurrencyCode;
  source: TransactionSource;
  /** Recognized speech a voice entry was created from. */
  voiceTranscript?: string | null;
}

export type TransactionSort = 'newest' | 'oldest';

export interface TransactionFilter {
  type?: TransactionType;
  categoryIds?: readonly number[];
  dateFrom?: IsoDate;
  dateTo?: IsoDate;
  /** Free text matched against the note and translated category names. */
  search?: string;
  sort?: TransactionSort;
}

/** Repository-level filter: search is split into a note pattern and matching category ids. */
export interface TransactionQuery extends Omit<TransactionFilter, 'search'> {
  search?: { text: string; categoryIds: readonly number[] };
}

export interface Page {
  limit: number;
  offset: number;
}

export interface PeriodTotals {
  incomeMinor: MinorAmount;
  expenseMinor: MinorAmount;
  /** income − expense (may be negative). */
  balanceMinor: MinorAmount;
}
