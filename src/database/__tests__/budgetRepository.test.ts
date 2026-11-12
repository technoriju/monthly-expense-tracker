import type { BudgetRecord } from '@/features/budgets/types';
import type { CurrencyCode } from '@/types/money';

import { budgetRepository } from '../repositories/budgetRepository';
import { categoryRepository } from '../repositories/categoryRepository';
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

const overall = (overrides: Partial<BudgetRecord> = {}): BudgetRecord => ({
  budgetType: 'overall',
  categoryId: null,
  amountMinor: 1_000_000,
  currency: 'INR',
  month: '2025-05',
  ...overrides,
});

async function category(key: string, overrides: Partial<BudgetRecord> = {}): Promise<BudgetRecord> {
  return {
    budgetType: 'category',
    categoryId: await idOf(key),
    amountMinor: 200_000,
    currency: 'INR',
    month: '2025-05',
    ...overrides,
  };
}

describe('budgetRepository', () => {
  it('inserts, reads, updates and removes a budget', async () => {
    const id = await budgetRepository.insert(overall(), 1000);
    expect(await budgetRepository.getById(id)).toEqual({
      id,
      budgetType: 'overall',
      categoryId: null,
      amountMinor: 1_000_000,
      currency: 'INR',
      month: '2025-05',
      createdAt: 1000,
      updatedAt: 1000,
    });

    expect(await budgetRepository.updateAmount(id, 1_500_000, 2000)).toBe(true);
    const updated = await budgetRepository.getById(id);
    expect(updated?.amountMinor).toBe(1_500_000);
    expect(updated?.updatedAt).toBe(2000);
    expect(updated?.createdAt).toBe(1000);

    expect(await budgetRepository.remove(id)).toBe(true);
    expect(await budgetRepository.getById(id)).toBeNull();
    expect(await budgetRepository.remove(id)).toBe(false);
    expect(await budgetRepository.updateAmount(id, 1, 3000)).toBe(false);
  });

  it('lists only the requested month and currency, overall first', async () => {
    await budgetRepository.insert(await category('food'));
    await budgetRepository.insert(overall());
    await budgetRepository.insert(overall({ month: '2025-04' }));
    await budgetRepository.insert(overall({ currency: 'BDT' as CurrencyCode }));

    const may = await budgetRepository.listByMonth('2025-05', 'INR');
    expect(may.map((b) => b.budgetType)).toEqual(['overall', 'category']);
    expect(may.every((b) => b.month === '2025-05' && b.currency === 'INR')).toBe(true);

    const april = await budgetRepository.listByMonth('2025-04', 'INR');
    expect(april).toHaveLength(1);
    expect(await budgetRepository.listByMonth('2025-06', 'INR')).toEqual([]);
  });

  it('finds the overall budget and category budgets by key', async () => {
    await budgetRepository.insert(overall());
    await budgetRepository.insert(await category('food'));
    expect((await budgetRepository.find('2025-05', 'INR', null))?.budgetType).toBe('overall');
    expect((await budgetRepository.find('2025-05', 'INR', await idOf('food')))?.amountMinor).toBe(
      200_000,
    );
    expect(await budgetRepository.find('2025-05', 'INR', await idOf('bazar'))).toBeNull();
    expect(await budgetRepository.find('2025-04', 'INR', null)).toBeNull();
  });

  it('rejects duplicate overall and category budgets for the same month and currency', async () => {
    await budgetRepository.insert(overall());
    await expect(budgetRepository.insert(overall({ amountMinor: 5 }))).rejects.toThrow();

    await budgetRepository.insert(await category('food'));
    await expect(budgetRepository.insert(await category('food'))).rejects.toThrow();

    // Same category in another month or another category is fine.
    await budgetRepository.insert(await category('food', { month: '2025-06' }));
    await budgetRepository.insert(await category('bazar'));
    expect(await budgetRepository.listByMonth('2025-05', 'INR')).toHaveLength(3);
  });

  it('enforces amount, type/category consistency, month format and expense categories', async () => {
    await expect(budgetRepository.insert(overall({ amountMinor: 0 }))).rejects.toThrow();
    await expect(budgetRepository.insert(overall({ amountMinor: -100 }))).rejects.toThrow();
    await expect(
      budgetRepository.insert(overall({ categoryId: await idOf('food') })),
    ).rejects.toThrow();
    await expect(
      budgetRepository.insert({ ...(await category('food')), categoryId: null }),
    ).rejects.toThrow();
    await expect(budgetRepository.insert(overall({ month: '2025-13' }))).rejects.toThrow();
    await expect(budgetRepository.insert(overall({ month: '2025-5' }))).rejects.toThrow();
    await expect(budgetRepository.insert(await category('salary'))).rejects.toThrow(
      /budget_category_not_expense/,
    );
    await expect(
      budgetRepository.insert({ ...(await category('food')), categoryId: 999_999 }),
    ).rejects.toThrow();
    expect(await budgetRepository.listByMonth('2025-05', 'INR')).toEqual([]);
  });

  it('blocks deleting a category that has budgets (history is preserved)', async () => {
    await budgetRepository.insert(await category('food'));
    await expect(
      mockDb.runAsync('DELETE FROM categories WHERE id = ?', [await idOf('food')]),
    ).rejects.toThrow();
  });
});
