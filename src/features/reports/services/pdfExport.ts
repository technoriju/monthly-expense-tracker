/**
 * Pure HTML generation for the PDF transaction export (rendered to PDF by expo-print). No I/O.
 * Colors come from the light theme: a printed page is always light.
 */
import type { Transaction } from '@/features/transactions/types';
import type { MinorAmount } from '@/types/money';
import { lightColors as c } from '@/theme';
import type { DateRange } from '@/utils/dates';

import { CSV_COLUMNS, CSV_FILE_PREFIX, type CsvLabels } from './csvExport';

export interface PdfLabels extends CsvLabels {
  title: string;
  /** Already-formatted period line, e.g. "1 Nov 2026 – 30 Nov 2026". */
  period: string;
  income: string;
  expense: string;
  net: string;
}

/** Columns shown in the PDF table (the raw decimal amount is CSV-only). */
const PDF_COLUMNS = CSV_COLUMNS.filter((col) => col !== 'amount');

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildTransactionsHtml(
  transactions: readonly Transaction[],
  labels: PdfLabels,
): string {
  let income: MinorAmount = 0;
  let expense: MinorAmount = 0;
  for (const tx of transactions) {
    if (tx.type === 'income') income += tx.amountMinor;
    else expense += tx.amountMinor;
  }

  const head = PDF_COLUMNS.map((col) => `<th>${escapeHtml(labels.headers[col])}</th>`).join('');
  const rows = transactions
    .map((tx) => {
      const cells = [
        tx.occurredOn,
        labels.type(tx.type),
        labels.category(tx),
        labels.money(tx.amountMinor),
        tx.paymentMethod ? labels.paymentMethod(tx.paymentMethod) : '',
        tx.note ?? '',
      ];
      return `<tr class="${tx.type}">${cells.map((v) => `<td>${escapeHtml(v)}</td>`).join('')}</tr>`;
    })
    .join('');

  const summary = (label: string, amount: MinorAmount, cls: string) =>
    `<div class="box"><div class="label">${escapeHtml(label)}</div><div class="${cls}">${escapeHtml(labels.money(amount))}</div></div>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { font-family: sans-serif; color: ${c.textPrimary}; font-size: 11px; margin: 0; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .period { color: ${c.textSecondary}; margin-bottom: 12px; }
  .summary { display: flex; gap: 8px; margin-bottom: 16px; }
  .box { flex: 1; border: 1px solid ${c.border}; border-radius: 6px; padding: 8px; }
  .label { color: ${c.textSecondary}; }
  .income, .expense, .net { font-size: 14px; font-weight: bold; }
  .income { color: ${c.incomeText}; }
  .expense { color: ${c.expenseText}; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 5px 4px; border-bottom: 1px solid ${c.border}; vertical-align: top; }
  th { background: ${c.surfaceMuted}; }
  tr { page-break-inside: avoid; }
  td:nth-child(4) { white-space: nowrap; }
  tr.income td:nth-child(4) { color: ${c.incomeText}; }
  tr.expense td:nth-child(4) { color: ${c.expenseText}; }
</style></head><body>
<h1>${escapeHtml(labels.title)}</h1>
<div class="period">${escapeHtml(labels.period)}</div>
<div class="summary">${summary(labels.income, income, 'income')}${summary(labels.expense, expense, 'expense')}${summary(labels.net, income - expense, 'net')}</div>
<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
}

export function pdfFileName(range: DateRange): string {
  return `${CSV_FILE_PREFIX}${range.from}_${range.to}.pdf`;
}
