/**
 * Pure CSV generation for the transaction export (RFC 4180). No I/O.
 * Output is UTF-8 with a byte-order mark so spreadsheet apps (Excel) read Bengali and
 * Hindi text correctly, and CRLF line endings.
 */
import type { Transaction } from '@/features/transactions/types';
import type { MinorAmount, PaymentMethod, TransactionType } from '@/types/money';
import { minorToDecimalString } from '@/utils/money';
import type { DateRange } from '@/utils/dates';

export const CSV_BOM = '﻿';
const CRLF = '\r\n';

export const CSV_COLUMNS = [
  'date',
  'type',
  'category',
  'amount',
  'amountFormatted',
  'paymentMethod',
  'note',
] as const;
export type CsvColumn = (typeof CSV_COLUMNS)[number];

export interface CsvLabels {
  /** Translated column headers. */
  headers: Record<CsvColumn, string>;
  type: (type: TransactionType) => string;
  category: (tx: Transaction) => string;
  paymentMethod: (method: PaymentMethod) => string;
  /** Currency display with Indian grouping, e.g. "₹1,25,000.50". */
  money: (amountMinor: MinorAmount) => string;
}

/** Characters that make spreadsheet apps evaluate a cell as a formula. */
const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * Escapes one field: neutralizes spreadsheet formulas (prefix `'`), then quotes the field
 * when it contains a comma, quote or line break, doubling inner quotes.
 */
export function escapeCsvField(value: string): string {
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function row(fields: readonly string[]): string {
  return fields.map(escapeCsvField).join(',');
}

export function buildTransactionsCsv(
  transactions: readonly Transaction[],
  labels: CsvLabels,
): string {
  const lines = [row(CSV_COLUMNS.map((c) => labels.headers[c]))];
  for (const tx of transactions) {
    lines.push(
      row([
        tx.occurredOn,
        labels.type(tx.type),
        labels.category(tx),
        minorToDecimalString(tx.amountMinor, tx.currency),
        labels.money(tx.amountMinor),
        tx.paymentMethod ? labels.paymentMethod(tx.paymentMethod) : '',
        tx.note ?? '',
      ]),
    );
  }
  return `${CSV_BOM}${lines.join(CRLF)}${CRLF}`;
}

export const CSV_FILE_PREFIX = 'transactions_';

export function csvFileName(range: DateRange): string {
  return `${CSV_FILE_PREFIX}${range.from}_${range.to}.csv`;
}
