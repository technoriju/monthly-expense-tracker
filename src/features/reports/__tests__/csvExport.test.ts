import { categoryRepository } from '@/database';
import {
  createMigratedTestDatabase,
  type TestDatabase,
} from '@/database/testing/createTestDatabase';
import type { Category } from '@/features/categories/types';
import { transactionService } from '@/features/transactions/services/transactionService';
import type { Transaction, TransactionInput } from '@/features/transactions/types';
import { useSettingsStore } from '@/store/settingsStore';
import { formatMoney } from '@/utils/format';
import { minorToDecimalString } from '@/utils/money';

import {
  buildTransactionsCsv,
  CSV_BOM,
  csvFileName,
  escapeCsvField,
  type CsvLabels,
} from '../services/csvExport';
import { exportService } from '../services/exportService';

let mockDb: TestDatabase;
const written: { name: string; content: string }[] = [];
const mockShare = jest.fn(async (_uri: string, _options?: unknown) => {});
let mockSharingAvailable = true;

jest.mock('@/database/client', () => ({
  getDatabase: async () => mockDb,
}));

const mockDeleted: string[] = [];
let mockCacheNames: string[] = [];

jest.mock('expo-file-system', () => {
  class MockFile {
    uri: string;
    name: string;
    exists = false;
    constructor(dir: unknown, name: string) {
      this.name = name;
      this.uri = `${String(dir)}/${name}`;
    }
    create() {}
    delete() {
      mockDeleted.push(this.name);
    }
    async write(content: string) {
      written.push({ name: this.name, content });
    }
  }
  return {
    File: MockFile,
    Paths: {
      cache: {
        toString: () => 'file:///cache',
        list: () => mockCacheNames.map((name) => new MockFile('file:///cache', name)),
      },
    },
  };
});

jest.mock('expo-sharing', () => ({
  isAvailableAsync: async () => mockSharingAvailable,
  shareAsync: (uri: string, options?: unknown) => mockShare(uri, options),
}));

const food: Category = {
  id: 1,
  key: 'food',
  type: 'expense',
  icon: 'Utensils',
  color: 'accent',
  sortOrder: 0,
  isDefault: true,
  customName: null,
  createdAt: 0,
};

function tx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 1,
    type: 'expense',
    amountMinor: 12_500_050,
    currency: 'INR',
    categoryId: 1,
    category: food,
    occurredOn: '2025-05-22',
    note: null,
    paymentMethod: null,
    source: 'manual',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

const labels: CsvLabels = {
  headers: {
    date: 'Date',
    type: 'Type',
    category: 'Category',
    amount: 'Amount',
    amountFormatted: 'Amount (formatted)',
    paymentMethod: 'Payment method',
    note: 'Note',
  },
  type: (type) => (type === 'expense' ? 'Expense' : 'Income'),
  category: (t) => t.category.key,
  paymentMethod: (m) => m.toUpperCase(),
  money: (minor) => formatMoney(minor, 'INR', 'en-IN'),
};

describe('escapeCsvField', () => {
  it('leaves plain text alone', () => {
    expect(escapeCsvField('Lunch')).toBe('Lunch');
  });

  it('quotes commas, quotes and line breaks', () => {
    expect(escapeCsvField('rice, dal')).toBe('"rice, dal"');
    expect(escapeCsvField('5" pipe')).toBe('"5"" pipe"');
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
    expect(escapeCsvField('a\r\nb')).toBe('"a\r\nb"');
  });

  it('neutralizes spreadsheet formulas', () => {
    expect(escapeCsvField('=SUM(A1:A9)')).toBe("'=SUM(A1:A9)");
    expect(escapeCsvField('+91 98')).toBe("'+91 98");
    expect(escapeCsvField('-5')).toBe("'-5");
    expect(escapeCsvField('@cmd')).toBe("'@cmd");
    expect(escapeCsvField('=1,2')).toBe(`"'=1,2"`);
  });
});

describe('buildTransactionsCsv', () => {
  it('writes a BOM, header row and CRLF-terminated rows', () => {
    const csv = buildTransactionsCsv(
      [tx({ note: 'Dinner, "family"', paymentMethod: 'upi' })],
      labels,
    );
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    const lines = csv.slice(1).split('\r\n');
    expect(lines[0]).toBe('Date,Type,Category,Amount,Amount (formatted),Payment method,Note');
    expect(lines[1]).toBe(
      '2025-05-22,Expense,food,125000.50,"₹1,25,000.50",UPI,"Dinner, ""family"""',
    );
    expect(lines[2]).toBe('');
    expect(lines).toHaveLength(3);
  });

  it('keeps Bengali text intact and leaves empty optional fields blank', () => {
    const bnLabels: CsvLabels = { ...labels, category: () => 'খাবার', type: () => 'খরচ' };
    const csv = buildTransactionsCsv(
      [tx({ note: 'বাজার থেকে মাছ', amountMinor: 50_000 })],
      bnLabels,
    );
    expect(csv).toContain('2025-05-22,খরচ,খাবার,500.00,₹500,,বাজার থেকে মাছ\r\n');
  });

  it('writes only the header for no transactions', () => {
    expect(buildTransactionsCsv([], labels).split('\r\n')).toHaveLength(2);
  });

  it('names the file after the range', () => {
    expect(csvFileName({ from: '2025-05-01', to: '2025-05-31' })).toBe(
      'transactions_2025-05-01_2025-05-31.csv',
    );
  });
});

describe('minorToDecimalString', () => {
  it('formats integer paise with two decimals and no floats', () => {
    expect(minorToDecimalString(0, 'INR')).toBe('0.00');
    expect(minorToDecimalString(5, 'INR')).toBe('0.05');
    expect(minorToDecimalString(125_050, 'INR')).toBe('1250.50');
    expect(minorToDecimalString(999_999_999_999, 'INR')).toBe('9999999999.99');
    expect(minorToDecimalString(-150, 'INR')).toBe('-1.50');
  });
});

describe('exportService.exportTransactionsCsv', () => {
  beforeEach(async () => {
    mockDb = await createMigratedTestDatabase();
    written.length = 0;
    mockDeleted.length = 0;
    mockCacheNames = [];
    mockShare.mockClear();
    mockSharingAvailable = true;
  });

  afterEach(() => {
    mockDb.close();
    useSettingsStore.getState().applySettings({ uiLanguage: 'en' });
  });

  async function add(input: Partial<TransactionInput> & { key: string }): Promise<void> {
    const category = (await categoryRepository.listAll()).find((c) => c.key === input.key);
    if (!category) throw new Error(input.key);
    await transactionService.create({
      type: category.type,
      amountMinor: 10_000,
      categoryId: category.id,
      occurredOn: '2025-05-10',
      note: null,
      paymentMethod: null,
      ...input,
    });
  }

  const MAY = { kind: 'month', month: '2025-05-01' } as const;

  it('writes the period’s transactions oldest first and opens the share sheet', async () => {
    await add({ key: 'food', occurredOn: '2025-05-20', note: 'Lunch' });
    await add({ key: 'salary', occurredOn: '2025-05-01', amountMinor: 7_500_000 });
    await add({ key: 'food', occurredOn: '2025-06-01' }); // outside the period

    expect(await exportService.exportTransactionsCsv(MAY)).toBe('shared');
    expect(written).toHaveLength(1);
    const file = written[0]!;
    expect(file.name).toBe('transactions_2025-05-01_2025-05-31.csv');
    const lines = file.content.replace(CSV_BOM, '').trim().split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe('2025-05-01,Income,Salary,75000.00,"₹75,000",,');
    expect(lines[2]).toBe('2025-05-20,Expense,Food,100.00,₹100,,Lunch');
    expect(mockShare).toHaveBeenCalledWith(
      'file:///cache/transactions_2025-05-01_2025-05-31.csv',
      expect.objectContaining({ mimeType: 'text/csv' }),
    );
  });

  it('uses Bengali headers, types and category names when the UI is Bengali', async () => {
    await add({ key: 'food', note: 'মাছ' });
    useSettingsStore.getState().applySettings({ uiLanguage: 'bn' });
    await exportService.exportTransactionsCsv(MAY);
    const content = written[0]!.content;
    expect(content.startsWith(CSV_BOM)).toBe(true);
    expect(content).toContain('তারিখ,ধরন,বিভাগ,পরিমাণ');
    expect(content).toContain('2025-05-10,খরচ,');
    expect(content).toContain(',100.00,');
    expect(content).toContain(',মাছ\r\n');
  });

  it('removes earlier CSV exports from the cache but leaves other files', async () => {
    await add({ key: 'food' });
    mockCacheNames = ['transactions_2025-04-01_2025-04-30.csv', 'other.json'];
    await exportService.exportTransactionsCsv(MAY);
    expect(mockDeleted).toEqual(['transactions_2025-04-01_2025-04-30.csv']);
  });

  it('does not create a file when the period is empty or sharing is unavailable', async () => {
    expect(await exportService.exportTransactionsCsv(MAY)).toBe('empty');
    mockSharingAvailable = false;
    expect(await exportService.exportTransactionsCsv(MAY)).toBe('unavailable');
    expect(written).toHaveLength(0);
    expect(mockShare).not.toHaveBeenCalled();
  });
});
