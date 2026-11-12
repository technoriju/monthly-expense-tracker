import type { BudgetType } from '@/features/budgets/types';
import type { TransactionSource } from '@/features/transactions/types';
import type { CurrencyCode, MinorAmount, PaymentMethod, TransactionType } from '@/types/money';

/** Every column of a `categories` row (camelCase), as stored. */
export interface CategorySnapshot {
  id: number;
  key: string;
  type: TransactionType;
  icon: string;
  color: string;
  sortOrder: number;
  isSystem: boolean;
  isArchived: boolean;
  customName: string | null;
  createdAt: number;
}

/** Every column of a `transactions` row (camelCase), as stored. */
export interface TransactionSnapshot {
  id: number;
  type: TransactionType;
  /** Integer minor units (paise). */
  amountMinor: MinorAmount;
  currency: CurrencyCode;
  categoryId: number;
  /** Local calendar date 'YYYY-MM-DD'. */
  occurredOn: string;
  note: string | null;
  paymentMethod: PaymentMethod | null;
  source: TransactionSource;
  voiceTranscript: string | null;
  createdAt: number;
  updatedAt: number;
}

/** Every column of a `budgets` row (camelCase), as stored. */
export interface BudgetSnapshot {
  id: number;
  budgetType: BudgetType;
  categoryId: number | null;
  amountMinor: MinorAmount;
  currency: CurrencyCode;
  /** 'YYYY-MM'. */
  month: string;
  createdAt: number;
  updatedAt: number;
}

/** All user data tables, read or written in one database transaction. */
export interface DataTables {
  categories: CategorySnapshot[];
  transactions: TransactionSnapshot[];
  budgets: BudgetSnapshot[];
}

export interface DataSnapshot extends DataTables {
  /** `PRAGMA user_version` at export time. */
  databaseVersion: number;
}

export interface DataCounts {
  transactions: number;
  categories: number;
  budgets: number;
}
