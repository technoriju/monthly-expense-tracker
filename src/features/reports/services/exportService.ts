import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { transactionRepository } from '@/database';
import { getCategoryName } from '@/features/categories/categoryName';
import type { Transaction } from '@/features/transactions/types';
import { getLanguage, i18n } from '@/i18n';
import { useSettingsStore } from '@/store/settingsStore';
import { formatMoney } from '@/utils/format';

import { resolveRange } from '../period';
import type { ReportPeriod } from '../types';
import { buildTransactionsCsv, csvFileName, type CsvLabels } from './csvExport';

const PAGE_SIZE = 500;

export type ExportResult = 'shared' | 'empty' | 'unavailable';

/** Every transaction of the period in the active currency, oldest first. */
async function loadTransactions(period: ReportPeriod): Promise<Transaction[]> {
  const { from, to } = resolveRange(period);
  const currency = useSettingsStore.getState().currency;
  const all: Transaction[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await transactionRepository.list(
      { dateFrom: from, dateTo: to, sort: 'oldest' },
      { limit: PAGE_SIZE, offset },
    );
    all.push(...page.filter((tx) => tx.currency === currency));
    if (page.length < PAGE_SIZE) return all;
  }
}

/** CSV labels in the active UI language. */
function currentLabels(): CsvLabels {
  const { uiLanguage, currency } = useSettingsStore.getState();
  const locale = getLanguage(uiLanguage).locale;
  const t = i18n.getFixedT(uiLanguage, 'reports');
  const tTx = i18n.getFixedT(uiLanguage, 'transactions');
  const tCat = i18n.getFixedT(uiLanguage, 'categories');
  return {
    headers: {
      date: t('export.columns.date'),
      type: t('export.columns.type'),
      category: t('export.columns.category'),
      amount: t('export.columns.amount'),
      amountFormatted: t('export.columns.amountFormatted'),
      paymentMethod: t('export.columns.paymentMethod'),
      note: t('export.columns.note'),
    },
    type: (type) => tTx(`type.${type}`),
    category: (tx) => getCategoryName(tCat, tx.category),
    paymentMethod: (method) => tTx(`paymentMethods.${method}`),
    money: (amountMinor) => formatMoney(amountMinor, currency, locale),
  };
}

export const exportService = {
  /**
   * Writes the period's transactions to a CSV file in the cache directory and opens the
   * system share sheet (save to Files/Drive, send, …). Nothing is uploaded by the app.
   */
  async exportTransactionsCsv(period: ReportPeriod): Promise<ExportResult> {
    if (!(await Sharing.isAvailableAsync())) return 'unavailable';
    const transactions = await loadTransactions(period);
    if (transactions.length === 0) return 'empty';

    const file = new File(Paths.cache, csvFileName(resolveRange(period)));
    if (file.exists) file.delete();
    file.create();
    await file.write(buildTransactionsCsv(transactions, currentLabels()));

    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      UTI: 'public.comma-separated-values-text',
      dialogTitle: i18n.getFixedT(
        useSettingsStore.getState().uiLanguage,
        'reports',
      )('export.dialogTitle'),
    });
    return 'shared';
  },
};
