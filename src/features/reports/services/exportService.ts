import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { transactionRepository } from '@/database';
import { getCategoryName } from '@/features/categories/categoryName';
import type { Transaction } from '@/features/transactions/types';
import { getLanguage, i18n } from '@/i18n';
import { useSettingsStore } from '@/store/settingsStore';
import { formatLongDate } from '@/utils/dates';
import { formatMoney } from '@/utils/format';

import { resolveRange } from '../period';
import type { ReportPeriod } from '../types';
import { buildTransactionsCsv, CSV_FILE_PREFIX, csvFileName, type CsvLabels } from './csvExport';
import { buildTransactionsHtml, pdfFileName, type PdfLabels } from './pdfExport';

const PAGE_SIZE = 500;

export type ExportResult = 'shared' | 'empty' | 'unavailable';
export type ExportFormat = 'csv' | 'pdf';

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

/**
 * Removes CSV/PDF files left in the app-private cache by earlier exports, so at most the latest
 * export's file stays on the device (the share sheet may still be reading it).
 */
function clearCachedExports(): void {
  for (const entry of Paths.cache.list()) {
    if (
      entry instanceof File &&
      entry.name.startsWith(CSV_FILE_PREFIX) &&
      (entry.name.endsWith('.csv') || entry.name.endsWith('.pdf'))
    ) {
      try {
        entry.delete();
      } catch {
        // Best effort: a leftover file stays in the app-private cache.
      }
    }
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

/** PDF labels in the active UI language. */
function currentPdfLabels(period: ReportPeriod): PdfLabels {
  const { uiLanguage } = useSettingsStore.getState();
  const t = i18n.getFixedT(uiLanguage, 'reports');
  const { from, to } = resolveRange(period);
  return {
    ...currentLabels(),
    title: t('export.pdfTitle'),
    period: `${formatLongDate(from, uiLanguage)} – ${formatLongDate(to, uiLanguage)}`,
    income: t('summary.income'),
    expense: t('summary.expense'),
    net: t('summary.netBalance'),
  };
}

function dialogTitle(): string {
  return i18n.getFixedT(useSettingsStore.getState().uiLanguage, 'reports')('export.dialogTitle');
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

    clearCachedExports();
    const file = new File(Paths.cache, csvFileName(resolveRange(period)));
    file.create({ overwrite: true });
    await file.write(buildTransactionsCsv(transactions, currentLabels()));

    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      UTI: 'public.comma-separated-values-text',
      dialogTitle: dialogTitle(),
    });
    return 'shared';
  },

  /**
   * Renders the period's transactions (with income/expense totals) to a PDF in the cache
   * directory, on-device, and opens the system share sheet. Nothing is uploaded by the app.
   */
  async exportTransactionsPdf(period: ReportPeriod): Promise<ExportResult> {
    if (!(await Sharing.isAvailableAsync())) return 'unavailable';
    const transactions = await loadTransactions(period);
    if (transactions.length === 0) return 'empty';

    clearCachedExports();
    const { uri } = await Print.printToFileAsync({
      html: buildTransactionsHtml(transactions, currentPdfLabels(period)),
      margins: { left: 24, right: 24, top: 24, bottom: 24 },
    });
    // expo-print picks a random name; give the file a readable one before sharing.
    const file = new File(Paths.cache, pdfFileName(resolveRange(period)));
    await new File(uri).move(file, { overwrite: true });

    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: dialogTitle(),
    });
    return 'shared';
  },
};
