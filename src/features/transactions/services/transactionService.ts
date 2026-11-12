import { categoryRepository, transactionRepository } from '@/database';
import { getCategoryName } from '@/features/categories/categoryName';
import { i18n } from '@/i18n';
import { useSettingsStore } from '@/store/settingsStore';
import { useUiStore } from '@/store/uiStore';
import { getMonthRange } from '@/utils/dates';

import { transactionInputSchema } from '../schemas';
import type {
  Page,
  PeriodTotals,
  Transaction,
  TransactionFilter,
  TransactionInput,
  TransactionQuery,
  TransactionSource,
} from '../types';

export type TransactionErrorCode = 'notFound' | 'categoryNotFound' | 'categoryMismatch';

export class TransactionError extends Error {
  constructor(readonly code: TransactionErrorCode) {
    super(`Transaction error: ${code}`);
    this.name = 'TransactionError';
  }
}

/** Validates input and the category rule: the category must exist and match the type. */
async function validate(input: TransactionInput): Promise<TransactionInput> {
  const parsed = transactionInputSchema.parse(input);
  const category = await categoryRepository.getById(parsed.categoryId);
  if (!category) throw new TransactionError('categoryNotFound');
  if (category.type !== parsed.type) throw new TransactionError('categoryMismatch');
  return parsed;
}

export interface CreateOptions {
  source?: TransactionSource;
  voiceTranscript?: string | null;
}

function dataChanged(): void {
  useUiStore.getState().bumpDataVersion();
}

/** Category ids whose key or name in the active UI language contains `text`. */
async function categoryIdsMatching(text: string): Promise<number[]> {
  const needle = text.toLocaleLowerCase();
  const t = i18n.getFixedT(null, 'categories');
  const categories = await categoryRepository.listAll();
  return categories
    .filter(
      (c) =>
        c.key.toLocaleLowerCase().includes(needle) ||
        getCategoryName(t, c).toLocaleLowerCase().includes(needle),
    )
    .map((c) => c.id);
}

export const transactionService = {
  /**
   * Creates a transaction in the active currency (manual by default; voice entries pass
   * their source and transcript). Returns the stored row.
   */
  async create(input: TransactionInput, options: CreateOptions = {}): Promise<Transaction> {
    const valid = await validate(input);
    const created = await transactionRepository.insertAndGet({
      ...valid,
      currency: useSettingsStore.getState().currency,
      source: options.source ?? 'manual',
      voiceTranscript: options.voiceTranscript ?? null,
    });
    dataChanged();
    return created;
  },

  async update(id: number, input: TransactionInput): Promise<void> {
    const valid = await validate(input);
    const updated = await transactionRepository.update(id, valid);
    if (!updated) throw new TransactionError('notFound');
    dataChanged();
  },

  async remove(id: number): Promise<void> {
    const removed = await transactionRepository.remove(id);
    if (!removed) throw new TransactionError('notFound');
    dataChanged();
  },

  getById(id: number): Promise<Transaction | null> {
    return transactionRepository.getById(id);
  },

  async list(filter: TransactionFilter, page: Page): Promise<Transaction[]> {
    const { search, ...rest } = filter;
    const text = search?.trim() ?? '';
    const query: TransactionQuery = { ...rest };
    if (text.length > 0) {
      query.search = { text, categoryIds: await categoryIdsMatching(text) };
    }
    return transactionRepository.list(query, page);
  },

  /** Most recent transactions within `month`. */
  listRecentForMonth(month: Date, limit: number): Promise<Transaction[]> {
    const { from, to } = getMonthRange(month);
    return transactionRepository.list({ dateFrom: from, dateTo: to }, { limit, offset: 0 });
  },

  /** Income, expense and balance for `month` in the active currency (integer paise). */
  async getMonthlyTotals(month: Date): Promise<PeriodTotals> {
    const { from, to } = getMonthRange(month);
    const totals = await transactionRepository.getTotalsByType(
      from,
      to,
      useSettingsStore.getState().currency,
    );
    return {
      incomeMinor: totals.income,
      expenseMinor: totals.expense,
      balanceMinor: totals.income - totals.expense,
    };
  },
};
