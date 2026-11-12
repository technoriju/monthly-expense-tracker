import type { Category } from '@/features/categories/types';

import {
  alertLevel,
  budgetProgress,
  budgetStatus,
  buildMonthOverview,
  parseBudgetMonth,
  percentUsed,
  toBudgetMonth,
} from '../calculations';
import type { Budget } from '../types';

const cat = (id: number, key: string, sortOrder = id): Category => ({
  id,
  key,
  type: 'expense',
  icon: 'Utensils',
  color: 'accent',
  sortOrder,
  isDefault: true,
  customName: null,
  createdAt: 0,
});

const FOOD = cat(1, 'food');
const BAZAR = cat(2, 'bazar');
const RENT = cat(3, 'rent');

const budget = (id: number, amountMinor: number, categoryId: number | null = null): Budget => ({
  id,
  budgetType: categoryId === null ? 'overall' : 'category',
  categoryId,
  amountMinor,
  currency: 'INR',
  month: '2025-05',
  createdAt: 0,
  updatedAt: 0,
});

describe('budgetProgress', () => {
  it('computes remaining and percent with integers', () => {
    expect(budgetProgress(1_000_000, 250_000)).toEqual({
      budgetMinor: 1_000_000,
      spentMinor: 250_000,
      remainingMinor: 750_000,
      percent: 25,
      status: 'within',
      alertLevel: null,
    });
  });

  it('reports a negative remaining and an uncapped percent when exceeded', () => {
    const p = budgetProgress(100_000, 134_050);
    expect(p.remainingMinor).toBe(-34_050);
    expect(p.percent).toBe(134);
    expect(p.status).toBe('exceeded');
    expect(p.alertLevel).toBe(100);
  });

  it('handles zero spending', () => {
    const p = budgetProgress(500_000, 0);
    expect(p).toMatchObject({ remainingMinor: 500_000, percent: 0, status: 'within' });
  });

  it('treats a missing, zero or negative budget as "no budget" without dividing by zero', () => {
    for (const amount of [null, 0, -100]) {
      expect(budgetProgress(amount, 5_000)).toEqual({
        budgetMinor: null,
        spentMinor: 5_000,
        remainingMinor: null,
        percent: null,
        status: 'none',
        alertLevel: null,
      });
    }
  });

  it('floors the percent so it never shows 100 before the limit is reached', () => {
    expect(percentUsed(100_000, 99_999)).toBe(99);
    expect(percentUsed(3, 1)).toBe(33);
    expect(percentUsed(3, 2)).toBe(66);
  });
});

describe('thresholds', () => {
  const B = 1_000_000; // ₹10,000
  it.each([
    [0, 'within', null],
    [790_000, 'within', null],
    [799_999, 'within', null],
    [800_000, 'approaching', 80],
    [899_999, 'approaching', 80],
    [900_000, 'approaching', 90],
    [999_999, 'approaching', 90],
    [1_000_000, 'exceeded', 100],
    [1_340_000, 'exceeded', 100],
  ] as const)('spent %i → %s (alert %s)', (spent, status, level) => {
    expect(budgetStatus(B, spent)).toBe(status);
    expect(alertLevel(B, spent)).toBe(level);
  });

  it('uses exact integer comparison for odd budgets (no float rounding)', () => {
    // 80% of 333 paise = 266.4 → 266 is below, 267 reaches it.
    expect(budgetStatus(333, 266)).toBe('within');
    expect(budgetStatus(333, 267)).toBe('approaching');
  });
});

describe('buildMonthOverview', () => {
  const categories = new Map([FOOD, BAZAR, RENT].map((c) => [c.id, c]));

  it('combines budgets with spending, keeps unbudgeted categories and dedupes alerts', () => {
    const overview = buildMonthOverview(
      '2025-05',
      [budget(1, 1_000_000), budget(2, 100_000, FOOD.id), budget(3, 50_000, RENT.id)],
      950_000,
      [
        { category: FOOD, totalMinor: 120_000, count: 3 },
        { category: BAZAR, totalMinor: 830_000, count: 5 },
      ],
      categories,
    );

    expect(overview.overall).toMatchObject({ percent: 95, status: 'approaching', alertLevel: 90 });
    expect(overview.categories.map((c) => [c.category.key, c.progress.percent])).toEqual([
      ['food', 120],
      ['rent', 0], // budget without spending shows 0
    ]);
    expect(overview.unbudgeted).toEqual([{ category: BAZAR, spentMinor: 830_000 }]);
    // One alert per budget at its highest threshold, exceeded first.
    expect(overview.alerts).toEqual([
      { kind: 'category', budgetId: 2, level: 100, percent: 120, category: FOOD },
      { kind: 'overall', budgetId: 1, level: 90, percent: 95 },
    ]);
  });

  it('returns a no-budget overview that still carries spending', () => {
    const overview = buildMonthOverview(
      '2025-05',
      [],
      40_000,
      [{ category: FOOD, totalMinor: 40_000, count: 1 }],
      categories,
    );
    expect(overview.overallBudget).toBeNull();
    expect(overview.overall).toMatchObject({ spentMinor: 40_000, status: 'none' });
    expect(overview.categories).toEqual([]);
    expect(overview.alerts).toEqual([]);
    expect(overview.unbudgeted).toHaveLength(1);
  });
});

describe('month helpers', () => {
  it('converts dates to and from YYYY-MM', () => {
    expect(toBudgetMonth(new Date(2025, 4, 31))).toBe('2025-05');
    expect(toBudgetMonth(new Date(2025, 0, 1))).toBe('2025-01');
    expect(parseBudgetMonth('2025-05')).toEqual(new Date(2025, 4, 1));
    expect(parseBudgetMonth('2025-13')).toBeNull();
    expect(parseBudgetMonth('garbage')).toBeNull();
  });
});
