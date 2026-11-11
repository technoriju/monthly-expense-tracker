import { changeUiLanguage } from '@/i18n';
import {
  createMigratedTestDatabase,
  type TestDatabase,
} from '@/database/testing/createTestDatabase';
import { categoryRepository } from '@/database';
import { useUiStore } from '@/store/uiStore';

import { groupByDate } from '../grouping';
import { TransactionError, transactionService } from '../services/transactionService';
import type { TransactionInput } from '../types';

let mockDb: TestDatabase;

jest.mock('@/database/client', () => ({
  getDatabase: async () => mockDb,
}));

beforeEach(async () => {
  mockDb = await createMigratedTestDatabase();
  await changeUiLanguage('en');
});

afterEach(() => {
  mockDb.close();
});

async function idOf(key: string): Promise<number> {
  const found = (await categoryRepository.listAll()).find((c) => c.key === key);
  if (!found) throw new Error(key);
  return found.id;
}

async function input(overrides: Partial<TransactionInput> = {}): Promise<TransactionInput> {
  return {
    type: 'expense',
    amountMinor: 50_000,
    categoryId: await idOf('food'),
    occurredOn: '2025-05-22',
    note: null,
    paymentMethod: null,
    ...overrides,
  };
}

describe('transactionService.create', () => {
  it('stores a manual transaction in the active currency and bumps dataVersion', async () => {
    const before = useUiStore.getState().dataVersion;
    const tx = await transactionService.create(await input({ note: 'Lunch' }));
    expect(tx).toMatchObject({
      amountMinor: 50_000,
      currency: 'INR',
      source: 'manual',
      note: 'Lunch',
    });
    expect(useUiStore.getState().dataVersion).toBe(before + 1);
  });

  it('rejects a category of the other type', async () => {
    const salary = await idOf('salary');
    await expect(transactionService.create(await input({ categoryId: salary }))).rejects.toEqual(
      new TransactionError('categoryMismatch'),
    );
  });

  it('rejects an unknown category', async () => {
    await expect(transactionService.create(await input({ categoryId: 99_999 }))).rejects.toEqual(
      new TransactionError('categoryNotFound'),
    );
  });

  it('rejects non-integer or non-positive amounts before touching the DB', async () => {
    await expect(transactionService.create(await input({ amountMinor: 10.5 }))).rejects.toThrow();
    await expect(transactionService.create(await input({ amountMinor: 0 }))).rejects.toThrow();
  });
});

describe('transactionService.update / remove', () => {
  it('edits every field including the type', async () => {
    const tx = await transactionService.create(await input());
    const salary = await idOf('salary');
    await transactionService.update(tx.id, {
      type: 'income',
      amountMinor: 7_500_000,
      categoryId: salary,
      occurredOn: '2025-05-01',
      note: 'May salary',
      paymentMethod: 'bank_transfer',
    });
    const updated = await transactionService.getById(tx.id);
    expect(updated).toMatchObject({
      type: 'income',
      amountMinor: 7_500_000,
      category: { key: 'salary' },
      occurredOn: '2025-05-01',
      note: 'May salary',
      paymentMethod: 'bank_transfer',
    });
    expect(updated?.updatedAt).toBeGreaterThanOrEqual(tx.updatedAt);
  });

  it('reports a deleted/unavailable transaction on update', async () => {
    await expect(transactionService.update(424_242, await input())).rejects.toEqual(
      new TransactionError('notFound'),
    );
  });

  it('deletes and bumps dataVersion; deleting again reports notFound', async () => {
    const tx = await transactionService.create(await input());
    const before = useUiStore.getState().dataVersion;
    await transactionService.remove(tx.id);
    expect(useUiStore.getState().dataVersion).toBe(before + 1);
    expect(await transactionService.getById(tx.id)).toBeNull();
    await expect(transactionService.remove(tx.id)).rejects.toEqual(
      new TransactionError('notFound'),
    );
  });
});

describe('transactionService monthly totals', () => {
  it('sums income, expense and balance for the month in integer paise', async () => {
    const salary = await idOf('salary');
    await transactionService.create(await input({ amountMinor: 10 })); // ₹0.10
    await transactionService.create(await input({ amountMinor: 20 })); // ₹0.20
    await transactionService.create(await input({ amountMinor: 4_268_000 - 30 }));
    await transactionService.create(
      await input({
        type: 'income',
        categoryId: salary,
        amountMinor: 7_500_000,
        occurredOn: '2025-05-01',
      }),
    );
    await transactionService.create(await input({ amountMinor: 99_999, occurredOn: '2025-04-30' }));
    await transactionService.create(await input({ amountMinor: 99_999, occurredOn: '2025-06-01' }));

    expect(await transactionService.getMonthlyTotals(new Date(2025, 4, 15))).toEqual({
      incomeMinor: 7_500_000,
      expenseMinor: 4_268_000,
      balanceMinor: 3_232_000,
    });
  });

  it('returns zeros and a negative balance correctly', async () => {
    expect(await transactionService.getMonthlyTotals(new Date(2030, 0, 1))).toEqual({
      incomeMinor: 0,
      expenseMinor: 0,
      balanceMinor: 0,
    });
    await transactionService.create(await input({ amountMinor: 500, occurredOn: '2030-01-31' }));
    expect((await transactionService.getMonthlyTotals(new Date(2030, 0, 1))).balanceMinor).toBe(
      -500,
    );
  });

  it('lists recent transactions only within the month', async () => {
    await transactionService.create(await input({ occurredOn: '2025-05-02' }));
    await transactionService.create(await input({ occurredOn: '2025-05-30' }));
    await transactionService.create(await input({ occurredOn: '2025-06-01' }));
    const recent = await transactionService.listRecentForMonth(new Date(2025, 4, 1), 5);
    expect(recent.map((t) => t.occurredOn)).toEqual(['2025-05-30', '2025-05-02']);
  });
});

describe('transactionService.list filtering', () => {
  beforeEach(async () => {
    const rent = await idOf('rent');
    const salary = await idOf('salary');
    await transactionService.create(await input({ note: 'Biryani', occurredOn: '2025-05-20' }));
    await transactionService.create(await input({ categoryId: rent, occurredOn: '2025-05-01' }));
    await transactionService.create(
      await input({
        type: 'income',
        categoryId: salary,
        amountMinor: 100,
        occurredOn: '2025-05-01',
      }),
    );
  });

  const page = { limit: 50, offset: 0 };

  it('searches by note', async () => {
    const list = await transactionService.list({ search: 'biry' }, page);
    expect(list.map((t) => t.note)).toEqual(['Biryani']);
  });

  it('searches by translated category name in the UI language', async () => {
    expect(await transactionService.list({ search: 'Rent' }, page)).toHaveLength(1);
    await changeUiLanguage('bn');
    expect(await transactionService.list({ search: 'ভাড়া' }, page)).toHaveLength(1);
    await changeUiLanguage('hi');
    expect(await transactionService.list({ search: 'वेतन' }, page)).toHaveLength(1);
  });

  it('combines type, category and date filters', async () => {
    expect(await transactionService.list({ type: 'expense' }, page)).toHaveLength(2);
    expect(
      await transactionService.list(
        { type: 'expense', dateFrom: '2025-05-10', dateTo: '2025-05-31' },
        page,
      ),
    ).toHaveLength(1);
    const rent = await idOf('rent');
    expect(await transactionService.list({ categoryIds: [rent] }, page)).toHaveLength(1);
  });

  it('groups results by date in list order', async () => {
    const groups = groupByDate(await transactionService.list({ sort: 'newest' }, page));
    expect(groups.map((g) => [g.date, g.transactions.length])).toEqual([
      ['2025-05-20', 1],
      ['2025-05-01', 2],
    ]);
  });
});
