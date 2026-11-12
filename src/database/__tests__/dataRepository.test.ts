import type { DataTables } from '@/features/data-management/types';

import { budgetRepository } from '../repositories/budgetRepository';
import { categoryRepository } from '../repositories/categoryRepository';
import { dataRepository } from '../repositories/dataRepository';
import { settingsRepository } from '../repositories/settingsRepository';
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

async function idOf(key: string): Promise<number> {
  const found = (await categoryRepository.listAll()).find((c) => c.key === key);
  if (!found) throw new Error(key);
  return found.id;
}

/** A few rows across every table, including Bengali text and a past-month budget. */
async function seedSampleData(): Promise<void> {
  const food = await idOf('food');
  const salary = await idOf('salary');
  await transactionRepository.insert(
    {
      type: 'expense',
      amountMinor: 12_550,
      currency: 'INR',
      categoryId: food,
      occurredOn: '2026-11-01',
      note: 'বাজার থেকে মাছ, "ভালো"',
      paymentMethod: 'upi',
      source: 'voice',
      voiceTranscript: 'মাছ একশো পঁচিশ টাকা পঞ্চাশ পয়সা',
    },
    1_000,
  );
  await transactionRepository.insert(
    {
      type: 'income',
      amountMinor: 7_500_000,
      currency: 'INR',
      categoryId: salary,
      occurredOn: '2026-10-31',
      note: null,
      paymentMethod: null,
      source: 'manual',
    },
    2_000,
  );
  await budgetRepository.insert(
    {
      budgetType: 'overall',
      categoryId: null,
      amountMinor: 5_000_000,
      currency: 'INR',
      month: '2026-10',
    },
    3_000,
  );
  await budgetRepository.insert(
    {
      budgetType: 'category',
      categoryId: food,
      amountMinor: 800_000,
      currency: 'INR',
      month: '2026-11',
    },
    4_000,
  );
}

describe('dataRepository.exportSnapshot', () => {
  it('copies every row and column of categories, transactions and budgets', async () => {
    await seedSampleData();
    const snapshot = await dataRepository.exportSnapshot();

    expect(snapshot.databaseVersion).toBe(3);
    expect(snapshot.categories).toHaveLength(SYSTEM_CATEGORIES.length);
    expect(snapshot.categories[0]).toEqual(
      expect.objectContaining({ isSystem: true, isArchived: false, customName: null }),
    );
    expect(snapshot.transactions).toHaveLength(2);
    expect(snapshot.transactions[0]).toEqual({
      id: 1,
      type: 'expense',
      amountMinor: 12_550,
      currency: 'INR',
      categoryId: await idOf('food'),
      occurredOn: '2026-11-01',
      note: 'বাজার থেকে মাছ, "ভালো"',
      paymentMethod: 'upi',
      source: 'voice',
      voiceTranscript: 'মাছ একশো পঁচিশ টাকা পঞ্চাশ পয়সা',
      createdAt: 1_000,
      updatedAt: 1_000,
    });
    expect(snapshot.budgets.map((b) => b.month)).toEqual(['2026-10', '2026-11']);
  });
});

describe('dataRepository.replaceAll', () => {
  it('round-trips a snapshot exactly (ids, paise, dates, text, relationships)', async () => {
    await seedSampleData();
    const before = await dataRepository.exportSnapshot();

    await dataRepository.clearUserData();
    expect((await dataRepository.counts()).transactions).toBe(0);

    await dataRepository.replaceAll(before, {});
    expect(await dataRepository.exportSnapshot()).toEqual(before);
  });

  it('replaces existing data instead of merging', async () => {
    await seedSampleData();
    const backup = await dataRepository.exportSnapshot();
    await transactionRepository.insert({
      type: 'expense',
      amountMinor: 100,
      currency: 'INR',
      categoryId: await idOf('rent'),
      occurredOn: '2026-11-05',
      note: 'added after backup',
      paymentMethod: null,
      source: 'manual',
    });

    await dataRepository.replaceAll(backup, {});
    const after = await dataRepository.exportSnapshot();
    expect(after.transactions).toEqual(backup.transactions);
  });

  it('keeps original category ids and re-adds missing system categories', async () => {
    const tables: DataTables = {
      categories: [
        {
          id: 42,
          key: 'food',
          type: 'expense',
          icon: 'Utensils',
          color: 'accent',
          sortOrder: 0,
          isSystem: true,
          isArchived: false,
          customName: null,
          createdAt: 5,
        },
      ],
      transactions: [
        {
          id: 7,
          type: 'expense',
          amountMinor: 999,
          currency: 'INR',
          categoryId: 42,
          occurredOn: '2026-01-15',
          note: null,
          paymentMethod: null,
          source: 'manual',
          voiceTranscript: null,
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      budgets: [],
    };
    await dataRepository.replaceAll(tables, {});

    const tx = await transactionRepository.getById(7);
    expect(tx?.category.key).toBe('food');
    expect(tx?.categoryId).toBe(42);
    expect(await categoryRepository.listAll()).toHaveLength(SYSTEM_CATEGORIES.length);
  });

  it('writes restored settings in the same transaction', async () => {
    await settingsRepository.set('uiLanguage', 'en');
    await dataRepository.replaceAll(await dataRepository.exportSnapshot(), {
      uiLanguage: 'bn',
      themeMode: 'dark',
    });
    expect(await settingsRepository.get('uiLanguage')).toBe('bn');
    expect(await settingsRepository.get('themeMode')).toBe('dark');
  });

  it('rolls back everything when a row fails (no partial restore)', async () => {
    await seedSampleData();
    await settingsRepository.set('uiLanguage', 'en');
    const before = await dataRepository.exportSnapshot();
    const broken: DataTables = {
      ...before,
      transactions: [
        ...before.transactions,
        { ...before.transactions[0]!, id: 99, amountMinor: 0 },
      ],
    };

    await expect(dataRepository.replaceAll(broken, { uiLanguage: 'bn' })).rejects.toThrow();
    expect(await dataRepository.exportSnapshot()).toEqual(before);
    expect(await settingsRepository.get('uiLanguage')).toBe('en');
  });

  it('rolls back on a dangling category reference even when the connection has foreign keys off', async () => {
    // Device: the exclusive-transaction connection does not have `foreign_keys = ON`.
    await mockDb.execAsync('PRAGMA foreign_keys = OFF');
    await seedSampleData();
    const before = await dataRepository.exportSnapshot();
    const broken: DataTables = {
      ...before,
      transactions: [{ ...before.transactions[0]!, categoryId: 12_345 }],
    };

    await expect(dataRepository.replaceAll(broken, {})).rejects.toThrow(/Foreign key/);
    expect(await dataRepository.exportSnapshot()).toEqual(before);
  });
});

describe('dataRepository.clearUserData', () => {
  it('deletes transactions and budgets, keeps settings and default categories', async () => {
    await seedSampleData();
    await settingsRepository.set('uiLanguage', 'hi');

    await dataRepository.clearUserData();

    expect(await dataRepository.counts()).toEqual({
      transactions: 0,
      budgets: 0,
      categories: SYSTEM_CATEGORIES.length,
    });
    expect(await settingsRepository.get('uiLanguage')).toBe('hi');
  });

  it('removes user-created categories and reseeds missing defaults', async () => {
    await mockDb.runAsync(
      `INSERT INTO categories (key, type, icon, color, sort_order, is_system, created_at)
       VALUES ('my_custom', 'expense', 'Store', 'primary', 99, 0, 1)`,
    );
    await mockDb.runAsync("DELETE FROM categories WHERE key = 'rent'");

    await dataRepository.clearUserData();

    const keys = (await categoryRepository.listAll()).map((c) => c.key).sort();
    expect(keys).toEqual(SYSTEM_CATEGORIES.map((c) => c.key).sort());
  });
});
