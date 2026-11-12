import type { Transaction } from '@/features/transactions/types';

import type { CsvLabels } from '../services/csvExport';
import { buildTransactionsHtml, escapeHtml, pdfFileName, type PdfLabels } from '../services/pdfExport';

const base: CsvLabels = {
  headers: {
    date: 'Date',
    type: 'Type',
    category: 'Category',
    amount: 'Amount',
    amountFormatted: 'Amount (formatted)',
    paymentMethod: 'Payment method',
    note: 'Note',
  },
  type: (type) => type,
  category: () => 'Food',
  paymentMethod: (method) => method,
  money: (minor) => `₹${minor / 100}`,
};

const labels: PdfLabels = {
  ...base,
  title: 'Transactions',
  period: '1 Nov 2026 – 30 Nov 2026',
  income: 'Income',
  expense: 'Expenses',
  net: 'Net balance',
};

const tx = (overrides: Partial<Transaction>): Transaction =>
  ({
    id: 1,
    type: 'expense',
    amountMinor: 25000,
    currency: 'INR',
    occurredOn: '2026-11-02',
    note: null,
    paymentMethod: null,
    ...overrides,
  }) as Transaction;

describe('pdfExport', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml(`<b>"Tom" & 'Jerry'</b>`)).toBe(
      '&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jerry&#39;&lt;/b&gt;',
    );
  });

  it('includes totals, rows and escaped notes', () => {
    const html = buildTransactionsHtml(
      [
        tx({ type: 'income', amountMinor: 100000 }),
        tx({ id: 2, amountMinor: 25000, note: '<script>x</script>' }),
      ],
      labels,
    );
    expect(html).toContain('₹1000'); // income
    expect(html).toContain('₹250'); // expense
    expect(html).toContain('₹750'); // net
    expect(html).toContain('1 Nov 2026 – 30 Nov 2026');
    expect(html).toContain('&lt;script&gt;x&lt;/script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<th>Amount</th>'); // raw decimal column is CSV-only
  });

  it('names the file after the range', () => {
    expect(pdfFileName({ from: '2026-11-01', to: '2026-11-30' })).toBe(
      'transactions_2026-11-01_2026-11-30.pdf',
    );
  });
});
