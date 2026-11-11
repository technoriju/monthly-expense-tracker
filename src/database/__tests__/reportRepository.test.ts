import type { TransactionRecord } from '@/features/transactions/types';
import type { CurrencyCode } from '@/types/money';

import { categoryRepository } from '../repositories/categoryRepository';
import { reportRepository } from '../repositories/reportRepository';
import { transactionRepository } from '../repositories/transactionRepository';
import { createMigratedTestDatabase, type TestDatabase } from '../testing/createTestDatabase';

let mockDb: TestDatabase;

jest.mock('../client', () => ({
  getDatabase: async () => mockDb,
}));

beforeEach(async () => {
  mockDb = await createMigratedTestDatabase();
});

afterEach(() => {
  mockDb.close();
});

async function idOf(key: string): Promise<number> {
  const found = (await categoryRepository.listAll()).find((c) => c.key === key);
  if (!found) throw new Error(key);
  return found.id;
}

async function add(
  key: string,
  amountMinor: number,
  occurredOn: string,
  type: TransactionRecord['type'] = 'expense',
): Promise<void> {
  await transactionRepository.insert({
    type,
    amountMinor,
    currency: 'INR',
    categoryId: await idOf(key),
    occurredOn,
    note: null,
    paymentMethod: null,
    source: 'manual',
  });
}

/** Inserts a row in another currency directly (the app only offers INR today). */
async function addForeign(amountMinor: number, occurredOn: string): Promise<void> {
  await mockDb.runAsync(
    `INSERT INTO transactions (type, amount_minor, currency, category_id, occurred_on, source,
       created_at, updated_at) VALUES ('expense', ?, ?, ?, ?, 'manual', 0, 0)`,
    [amountMinor, 'BDT' as CurrencyCode, await idOf('food'), occurredOn],
  );
}

const FROM = '2025-05-01';
const TO = '2025-05-31';

describe('reportRepository', () => {
  beforeEach(async () => {
    await add('salary', 7_500_000, '2025-05-01', 'income');
    await add('freelance', 1_000_000, '2025-05-15', 'income');
    await add('food', 50_000, '2025-05-01');
    await add('food', 25_050, '2025-05-22');
    await add('bazar', 10_000, '2025-05-22');
    await add('bazar', 10_000, '2025-05-31'); // inclusive end
    await add('food', 99_900, '2025-04-30'); // before range
    await add('food', 99_900, '2025-06-01'); // after range
    await addForeign(123_400, '2025-05-10'); // other currency
  });

  it('sums and counts per type within the inclusive range and active currency', async () => {
    const rows = await reportRepository.getTypeTotals(FROM, TO, 'INR');
    expect(rows).toEqual(
      expect.arrayContaining([
        { type: 'income', totalMinor: 8_500_000, count: 2 },
        { type: 'expense', totalMinor: 95_050, count: 4 },
      ]),
    );
    expect(rows).toHaveLength(2);
  });

  it('groups by category within one type, largest first', async () => {
    const expense = await reportRepository.getCategoryTotals(FROM, TO, 'INR', 'expense');
    expect(expense.map((r) => [r.category.key, r.totalMinor, r.count])).toEqual([
      ['food', 75_050, 2],
      ['bazar', 20_000, 2],
    ]);
    expect(expense.every((r) => r.category.type === 'expense')).toBe(true);
    const income = await reportRepository.getCategoryTotals(FROM, TO, 'INR', 'income');
    expect(income.map((r) => r.category.key)).toEqual(['salary', 'freelance']);
  });

  it('groups by day and type in date order', async () => {
    const rows = await reportRepository.getDailyTotals(FROM, TO, 'INR');
    expect(rows).toEqual([
      { date: '2025-05-01', type: 'expense', totalMinor: 50_000, count: 1 },
      { date: '2025-05-01', type: 'income', totalMinor: 7_500_000, count: 1 },
      { date: '2025-05-15', type: 'income', totalMinor: 1_000_000, count: 1 },
      { date: '2025-05-22', type: 'expense', totalMinor: 35_050, count: 2 },
      { date: '2025-05-31', type: 'expense', totalMinor: 10_000, count: 1 },
    ]);
  });

  it('groups by month and type', async () => {
    const rows = await reportRepository.getMonthlyTotals('2025-01-01', '2025-12-31', 'INR');
    expect(rows).toEqual([
      { month: '2025-04', type: 'expense', totalMinor: 99_900, count: 1 },
      { month: '2025-05', type: 'expense', totalMinor: 95_050, count: 4 },
      { month: '2025-05', type: 'income', totalMinor: 8_500_000, count: 2 },
      { month: '2025-06', type: 'expense', totalMinor: 99_900, count: 1 },
    ]);
  });

  it('returns nothing for an empty range', async () => {
    expect(await reportRepository.getTypeTotals('2024-01-01', '2024-01-31', 'INR')).toEqual([]);
    expect(
      await reportRepository.getCategoryTotals('2024-01-01', '2024-01-31', 'INR', 'expense'),
    ).toEqual([]);
    expect(await reportRepository.getDailyTotals('2024-01-01', '2024-01-31', 'INR')).toEqual([]);
  });
});
