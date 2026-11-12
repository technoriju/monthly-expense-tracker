import type { TransactionRecord } from '@/features/transactions/types';

import { categoryRepository } from '../repositories/categoryRepository';
import { transactionRepository } from '../repositories/transactionRepository';
import { SYSTEM_CATEGORIES } from '../seed/systemCategories';
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

async function categoryId(key: string): Promise<number> {
  const all = await categoryRepository.listAll();
  const found = all.find((c) => c.key === key);
  if (!found) throw new Error(`missing category ${key}`);
  return found.id;
}

async function record(overrides: Partial<TransactionRecord> = {}): Promise<TransactionRecord> {
  return {
    type: 'expense',
    amountMinor: 50_000,
    currency: 'INR',
    categoryId: await categoryId('food'),
    occurredOn: '2025-05-22',
    note: null,
    paymentMethod: null,
    source: 'manual',
    ...overrides,
  };
}

describe('categoryRepository', () => {
  it('seeds every system category with type, icon, color and isDefault', async () => {
    const all = await categoryRepository.listAll();
    expect(all).toHaveLength(SYSTEM_CATEGORIES.length);
    expect(all.every((c) => c.isDefault && c.icon && c.color && c.createdAt > 0)).toBe(true);
    const expense = await categoryRepository.listByType('expense');
    const income = await categoryRepository.listByType('income');
    expect(expense.map((c) => c.key)).toContain('bazar');
    expect(income.map((c) => c.key)).toEqual([
      'salary',
      'freelance',
      'business',
      'investment',
      'gift',
      'other_income',
    ]);
    expect(expense.length + income.length).toBe(SYSTEM_CATEGORIES.length);
  });

  it('never duplicates on repeated seeding', async () => {
    expect(await categoryRepository.seedSystemCategories()).toBe(0);
    expect(await categoryRepository.seedSystemCategories()).toBe(0);
    expect(await categoryRepository.listAll()).toHaveLength(SYSTEM_CATEGORIES.length);
  });

  it('gets a category by id, or null', async () => {
    const id = await categoryId('salary');
    expect((await categoryRepository.getById(id))?.type).toBe('income');
    expect(await categoryRepository.getById(99_999)).toBeNull();
  });

  it('lists a type by usage (most used first), ties in sort order', async () => {
    const rent = await categoryId('rent');
    const travel = await categoryId('travel');
    await transactionRepository.insert(await record({ categoryId: travel }), 1_000);
    await transactionRepository.insert(await record({ categoryId: rent }), 1_000);
    await transactionRepository.insert(await record({ categoryId: rent }), 1_000);
    const keys = (await categoryRepository.listByTypeByUsage('expense')).map((c) => c.key);
    expect(keys.slice(0, 4)).toEqual(['rent', 'travel', 'food', 'groceries']);
    expect(keys).toHaveLength(SYSTEM_CATEGORIES.filter((c) => c.type === 'expense').length);
  });

  it('creates a custom category at the end of its type with the given name', async () => {
    const created = await categoryRepository.createCustom('income', 'Pocket money', 5_000);
    expect(created).toMatchObject({
      type: 'income',
      customName: 'Pocket money',
      isDefault: false,
      icon: 'Tag',
      color: 'primary',
      createdAt: 5_000,
    });
    expect(created.key).toMatch(/^custom_/);
    const income = await categoryRepository.listByType('income');
    expect(income.at(-1)?.id).toBe(created.id);
    const id = await transactionRepository.insert(
      await record({ type: 'income', categoryId: created.id }),
      1_000,
    );
    expect((await transactionRepository.getById(id))?.category.customName).toBe('Pocket money');
  });

  it('archives only custom categories; their transactions keep the category', async () => {
    const custom = await categoryRepository.createCustom('expense', 'Pets', 5_000);
    const txId = await transactionRepository.insert(
      await record({ categoryId: custom.id }),
      1_000,
    );
    expect(await categoryRepository.archiveCustom(custom.id)).toBe(true);
    expect(await categoryRepository.archiveCustom(custom.id)).toBe(false);
    expect((await categoryRepository.listByType('expense')).map((c) => c.id)).not.toContain(
      custom.id,
    );
    expect((await transactionRepository.getById(txId))?.category.customName).toBe('Pets');
    expect(await categoryRepository.archiveCustom(await categoryId('food'))).toBe(false);
  });
});

describe('transactionRepository CRUD', () => {
  it('inserts and reads back a transaction with its category', async () => {
    const id = await transactionRepository.insert(
      await record({ note: 'Lunch', paymentMethod: 'upi' }),
      1_000,
    );
    const tx = await transactionRepository.getById(id);
    expect(tx).toMatchObject({
      id,
      type: 'expense',
      amountMinor: 50_000,
      currency: 'INR',
      occurredOn: '2025-05-22',
      note: 'Lunch',
      paymentMethod: 'upi',
      source: 'manual',
      createdAt: 1_000,
      updatedAt: 1_000,
      category: { key: 'food', type: 'expense' },
    });
  });

  it('updates fields and updated_at, keeping created_at', async () => {
    const id = await transactionRepository.insert(await record(), 1_000);
    const salary = await categoryId('salary');
    const ok = await transactionRepository.update(
      id,
      {
        type: 'income',
        amountMinor: 7_500_000,
        categoryId: salary,
        occurredOn: '2025-05-01',
        note: 'May',
        paymentMethod: 'bank_transfer',
      },
      2_000,
    );
    expect(ok).toBe(true);
    const tx = await transactionRepository.getById(id);
    expect(tx).toMatchObject({
      type: 'income',
      amountMinor: 7_500_000,
      categoryId: salary,
      occurredOn: '2025-05-01',
      note: 'May',
      paymentMethod: 'bank_transfer',
      createdAt: 1_000,
      updatedAt: 2_000,
    });
  });

  it('reports missing rows on update and delete', async () => {
    const base = await record();
    expect(await transactionRepository.update(424_242, base)).toBe(false);
    expect(await transactionRepository.remove(424_242)).toBe(false);
  });

  it('deletes a transaction', async () => {
    const id = await transactionRepository.insert(await record());
    expect(await transactionRepository.remove(id)).toBe(true);
    expect(await transactionRepository.getById(id)).toBeNull();
  });

  it('enforces amount > 0, valid payment method and the category foreign key', async () => {
    await expect(transactionRepository.insert(await record({ amountMinor: 0 }))).rejects.toThrow();
    await expect(
      transactionRepository.insert(await record({ categoryId: 99_999 })),
    ).rejects.toThrow();
    await expect(
      // @ts-expect-error — invalid value on purpose, rejected by the CHECK constraint
      transactionRepository.insert(await record({ paymentMethod: 'cheque' })),
    ).rejects.toThrow();
  });
});

describe('transactionRepository queries', () => {
  beforeEach(async () => {
    const food = await categoryId('food');
    const rent = await categoryId('rent');
    const salary = await categoryId('salary');
    const rows: [Partial<TransactionRecord>, number][] = [
      [{ categoryId: food, amountMinor: 50_000, occurredOn: '2025-05-22', note: 'Pizza 100%' }, 1],
      [{ categoryId: rent, amountMinor: 1_500_000, occurredOn: '2025-05-01' }, 2],
      [{ type: 'income', categoryId: salary, amountMinor: 7_500_000, occurredOn: '2025-05-01' }, 3],
      [{ categoryId: food, amountMinor: 12_345, occurredOn: '2025-04-30', note: 'Tea' }, 4],
      [{ categoryId: food, amountMinor: 999, occurredOn: '2025-05-22', currency: 'INR' }, 5],
    ];
    for (const [overrides, at] of rows) {
      await transactionRepository.insert(await record(overrides), at);
    }
  });

  const page = { limit: 50, offset: 0 };

  it('sorts newest first by date, then creation time', async () => {
    const list = await transactionRepository.list({}, page);
    expect(list.map((t) => [t.occurredOn, t.createdAt])).toEqual([
      ['2025-05-22', 5],
      ['2025-05-22', 1],
      ['2025-05-01', 3],
      ['2025-05-01', 2],
      ['2025-04-30', 4],
    ]);
  });

  it('sorts oldest first', async () => {
    const list = await transactionRepository.list({ sort: 'oldest' }, page);
    expect(list[0]?.occurredOn).toBe('2025-04-30');
  });

  it('filters by type, category and inclusive date range', async () => {
    expect(await transactionRepository.list({ type: 'income' }, page)).toHaveLength(1);
    const rent = await categoryId('rent');
    expect(await transactionRepository.list({ categoryIds: [rent] }, page)).toHaveLength(1);
    expect(await transactionRepository.list({ categoryIds: [] }, page)).toHaveLength(0);
    const may = await transactionRepository.list(
      { dateFrom: '2025-05-01', dateTo: '2025-05-31' },
      page,
    );
    expect(may).toHaveLength(4);
  });

  it('searches notes literally (wildcards escaped) or by category ids', async () => {
    expect(
      await transactionRepository.list({ search: { text: 'tea', categoryIds: [] } }, page),
    ).toHaveLength(1);
    expect(
      await transactionRepository.list({ search: { text: '100%', categoryIds: [] } }, page),
    ).toHaveLength(1);
    expect(
      await transactionRepository.list({ search: { text: '%', categoryIds: [] } }, page),
    ).toHaveLength(1);
    const rent = await categoryId('rent');
    expect(
      await transactionRepository.list({ search: { text: 'zzz', categoryIds: [rent] } }, page),
    ).toHaveLength(1);
  });

  it('paginates with limit/offset', async () => {
    const first = await transactionRepository.list({}, { limit: 2, offset: 0 });
    const second = await transactionRepository.list({}, { limit: 2, offset: 2 });
    const third = await transactionRepository.list({}, { limit: 2, offset: 4 });
    expect([...first, ...second, ...third].map((t) => t.id)).toHaveLength(5);
    expect(new Set([...first, ...second].map((t) => t.id)).size).toBe(4);
    expect(third).toHaveLength(1);
  });

  it('sums monthly totals per type in integer paise', async () => {
    expect(await transactionRepository.getTotalsByType('2025-05-01', '2025-05-31', 'INR')).toEqual({
      income: 7_500_000,
      expense: 1_550_999,
    });
    expect(await transactionRepository.getTotalsByType('2025-06-01', '2025-06-30', 'INR')).toEqual({
      income: 0,
      expense: 0,
    });
  });
});
