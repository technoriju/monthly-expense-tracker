import { categoryRepository } from '@/database';
import {
  createMigratedTestDatabase,
  type TestDatabase,
} from '@/database/testing/createTestDatabase';
import { transactionService } from '@/features/transactions/services/transactionService';
import { changeUiLanguage } from '@/i18n';
import { useUiStore } from '@/store/uiStore';

import { BudgetError, budgetService } from '../services/budgetService';

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

const MAY = new Date(2025, 4, 15);
const APRIL = new Date(2025, 3, 1);

async function idOf(key: string): Promise<number> {
  const found = (await categoryRepository.listAll()).find((c) => c.key === key);
  if (!found) throw new Error(key);
  return found.id;
}

async function spend(key: string, amountMinor: number, occurredOn: string): Promise<number> {
  const category = (await categoryRepository.listAll()).find((c) => c.key === key);
  if (!category) throw new Error(key);
  const tx = await transactionService.create({
    type: category.type,
    amountMinor,
    categoryId: category.id,
    occurredOn,
    note: null,
    paymentMethod: null,
  });
  return tx.id;
}

const overall = (amountMinor: number, month: Date = MAY) =>
  budgetService.create({ budgetType: 'overall', categoryId: null, month, amountMinor });

describe('budgetService writes', () => {
  it('creates, edits and deletes a budget and bumps dataVersion each time', async () => {
    const before = useUiStore.getState().dataVersion;
    const created = await overall(1_000_000);
    expect(created).toMatchObject({ budgetType: 'overall', month: '2025-05', currency: 'INR' });

    await budgetService.updateAmount(created.id, 1_200_000);
    expect((await budgetService.getMonthOverview(MAY)).overall.budgetMinor).toBe(1_200_000);

    await budgetService.remove(created.id);
    expect((await budgetService.getMonthOverview(MAY)).overallBudget).toBeNull();
    expect(useUiStore.getState().dataVersion).toBe(before + 3);
  });

  it('rejects duplicates for the same month', async () => {
    await overall(1_000_000);
    await expect(overall(5_000)).rejects.toEqual(new BudgetError('duplicate'));
    const food = await idOf('food');
    await budgetService.create({
      budgetType: 'category',
      categoryId: food,
      month: MAY,
      amountMinor: 1,
    });
    await expect(
      budgetService.create({
        budgetType: 'category',
        categoryId: food,
        month: MAY,
        amountMinor: 2,
      }),
    ).rejects.toEqual(new BudgetError('duplicate'));
  });

  it('rejects income and unknown categories and invalid amounts', async () => {
    await expect(
      budgetService.create({
        budgetType: 'category',
        categoryId: await idOf('salary'),
        month: MAY,
        amountMinor: 100,
      }),
    ).rejects.toEqual(new BudgetError('categoryNotExpense'));
    await expect(
      budgetService.create({
        budgetType: 'category',
        categoryId: 99_999,
        month: MAY,
        amountMinor: 1,
      }),
    ).rejects.toEqual(new BudgetError('categoryNotFound'));
    await expect(overall(0)).rejects.toThrow();
    await expect(overall(-1)).rejects.toThrow();
    await expect(overall(10.5)).rejects.toThrow();
  });

  it('reports notFound for missing budgets', async () => {
    await expect(budgetService.updateAmount(12345, 100)).rejects.toEqual(
      new BudgetError('notFound'),
    );
    await expect(budgetService.remove(12345)).rejects.toEqual(new BudgetError('notFound'));
  });
});

describe('budgetService.getMonthOverview', () => {
  it('counts only expenses of the selected month; income never consumes the budget', async () => {
    await overall(1_000_000);
    await spend('food', 300_000, '2025-05-01');
    await spend('bazar', 200_000, '2025-05-31');
    await spend('salary', 9_000_000, '2025-05-10'); // income
    await spend('food', 777_000, '2025-04-30'); // previous month
    await spend('food', 777_000, '2025-06-01'); // next month

    const { overall: progress } = await budgetService.getMonthOverview(MAY);
    expect(progress).toEqual({
      budgetMinor: 1_000_000,
      spentMinor: 500_000,
      remainingMinor: 500_000,
      percent: 50,
      status: 'within',
      alertLevel: null,
    });
  });

  it('computes category budgets and lists categories without a budget', async () => {
    await budgetService.create({
      budgetType: 'category',
      categoryId: await idOf('food'),
      month: MAY,
      amountMinor: 100_000,
    });
    await spend('food', 85_000, '2025-05-02');
    await spend('bazar', 40_000, '2025-05-03');

    const overview = await budgetService.getMonthOverview(MAY);
    expect(overview.categories).toHaveLength(1);
    expect(overview.categories[0]?.progress).toMatchObject({
      spentMinor: 85_000,
      remainingMinor: 15_000,
      percent: 85,
      status: 'approaching',
      alertLevel: 80,
    });
    expect(overview.unbudgeted.map((u) => [u.category.key, u.spentMinor])).toEqual([
      ['bazar', 40_000],
    ]);
    expect(overview.alerts).toEqual([
      expect.objectContaining({ kind: 'category', level: 80, percent: 85 }),
    ]);
  });

  it('keeps previous months intact (history) when a new month gets a budget', async () => {
    await overall(500_000, APRIL);
    await spend('food', 450_000, '2025-04-10');
    await overall(2_000_000, MAY);

    const april = await budgetService.getMonthOverview(APRIL);
    expect(april.month).toBe('2025-04');
    expect(april.overall).toMatchObject({
      budgetMinor: 500_000,
      spentMinor: 450_000,
      remainingMinor: 50_000,
      percent: 90,
      alertLevel: 90,
    });
    expect((await budgetService.getMonthOverview(MAY)).overall.budgetMinor).toBe(2_000_000);
    expect((await budgetService.getMonthOverview(new Date(2025, 5, 1))).overallBudget).toBeNull();
  });

  it('updates progress and alerts when transactions are added, edited and deleted', async () => {
    await overall(100_000);
    const a = await spend('food', 70_000, '2025-05-05');
    let o = await budgetService.getMonthOverview(MAY);
    expect(o.overall).toMatchObject({ percent: 70, status: 'within', alertLevel: null });

    const b = await spend('bazar', 10_000, '2025-05-06');
    o = await budgetService.getMonthOverview(MAY);
    expect(o.overall).toMatchObject({ percent: 80, status: 'approaching', alertLevel: 80 });

    await transactionService.update(b, {
      type: 'expense',
      amountMinor: 20_000,
      categoryId: await idOf('bazar'),
      occurredOn: '2025-05-06',
      note: null,
      paymentMethod: null,
    });
    o = await budgetService.getMonthOverview(MAY);
    expect(o.overall).toMatchObject({ percent: 90, alertLevel: 90 });

    await spend('food', 10_000, '2025-05-07');
    o = await budgetService.getMonthOverview(MAY);
    expect(o.overall).toMatchObject({ percent: 100, status: 'exceeded', alertLevel: 100 });
    expect(o.alerts).toHaveLength(1); // one alert, not 80 + 90 + 100

    await transactionService.remove(a);
    o = await budgetService.getMonthOverview(MAY);
    expect(o.overall).toMatchObject({ percent: 30, status: 'within', alertLevel: null });
    expect(o.alerts).toEqual([]);
  });
});
