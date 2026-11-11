import type { Category } from '@/features/categories/types';

import {
  buildCalendarMonth,
  buildCategoryBreakdown,
  buildDailyTrend,
  buildMonthlyTrend,
  compareMetric,
  comparePeriods,
  daysElapsed,
  savingsRateBp,
  summarize,
  toTypeTotals,
  trendGranularity,
  wholePercentages,
} from '../analytics';
import type { CategoryTotalRow, DailyTotalRow, TypeTotalRow } from '../types';

const MAY = { from: '2025-05-01', to: '2025-05-31' };
const AFTER_MAY = new Date(2025, 6, 15);

function category(id: number, key: string, sortOrder = id): Category {
  return {
    id,
    key,
    type: 'expense',
    icon: 'Utensils',
    color: 'accent',
    sortOrder,
    isDefault: true,
    createdAt: 0,
  };
}

const typeRows = (income: number, expense: number): TypeTotalRow[] => [
  { type: 'income', totalMinor: income, count: income > 0 ? 2 : 0 },
  { type: 'expense', totalMinor: expense, count: expense > 0 ? 3 : 0 },
];

const expenseDay = (date: string, totalMinor: number, count = 1): DailyTotalRow => ({
  date,
  type: 'expense',
  totalMinor,
  count,
});

describe('summarize', () => {
  it('computes income, expenses, net balance and savings in paise', () => {
    const s = summarize(typeRows(7_500_000, 4_268_000), [], MAY, AFTER_MAY);
    expect(s.incomeMinor).toBe(7_500_000);
    expect(s.expenseMinor).toBe(4_268_000);
    expect(s.netBalanceMinor).toBe(3_232_000);
    expect(s.savedMinor).toBe(3_232_000);
    expect(s.savingsRateBp).toBe(4309); // 43.09%
    expect(s.transactionCount).toBe(5);
    expect(Number.isInteger(s.netBalanceMinor)).toBe(true);
  });

  it('keeps a negative net balance but never negative savings', () => {
    const s = summarize(typeRows(100_000, 250_000), [], MAY, AFTER_MAY);
    expect(s.netBalanceMinor).toBe(-150_000);
    expect(s.savedMinor).toBe(0);
    expect(s.savingsRateBp).toBe(0);
  });

  it('returns a null savings rate when there is no income', () => {
    const s = summarize(typeRows(0, 50_000), [], MAY, AFTER_MAY);
    expect(s.savingsRateBp).toBeNull();
    expect(s.savedMinor).toBe(0);
  });

  it('is all zeros for an empty period', () => {
    const s = summarize([], [], MAY, AFTER_MAY);
    expect(s).toMatchObject({
      incomeMinor: 0,
      expenseMinor: 0,
      netBalanceMinor: 0,
      savingsRateBp: null,
      transactionCount: 0,
      avgDailyExpenseMinor: 0,
      highestExpenseDay: null,
      lowestExpenseDay: null,
    });
  });

  it('averages daily expenses over the whole past month', () => {
    const s = summarize(typeRows(0, 3_100_000), [], MAY, AFTER_MAY);
    expect(s.daysCounted).toBe(31);
    expect(s.avgDailyExpenseMinor).toBe(100_000);
  });

  it('averages the current month only up to today', () => {
    const s = summarize(typeRows(0, 1_000_000), [], MAY, new Date(2025, 4, 10));
    expect(s.daysCounted).toBe(10);
    expect(s.avgDailyExpenseMinor).toBe(100_000);
  });

  it('rounds the daily average to whole paise', () => {
    const s = summarize(typeRows(0, 100), [], { from: '2025-05-01', to: '2025-05-03' }, AFTER_MAY);
    expect(s.avgDailyExpenseMinor).toBe(33);
  });

  it('finds the highest and lowest spending days (earliest wins ties)', () => {
    const daily: DailyTotalRow[] = [
      expenseDay('2025-05-02', 50_000),
      { date: '2025-05-03', type: 'income', totalMinor: 9_999_999, count: 1 },
      expenseDay('2025-05-05', 120_000),
      expenseDay('2025-05-09', 20_000),
      expenseDay('2025-05-20', 120_000),
      expenseDay('2025-05-21', 20_000),
    ];
    const s = summarize(typeRows(0, 330_000), daily, MAY, AFTER_MAY);
    expect(s.highestExpenseDay).toEqual({ date: '2025-05-05', amountMinor: 120_000 });
    expect(s.lowestExpenseDay).toEqual({ date: '2025-05-09', amountMinor: 20_000 });
  });
});

describe('savingsRateBp / daysElapsed', () => {
  it('handles zero income safely', () => {
    expect(savingsRateBp(0, 0)).toBeNull();
    expect(savingsRateBp(100, 0)).toBeNull();
    expect(savingsRateBp(5_000, 10_000)).toBe(5_000);
  });

  it('counts the full range for future periods', () => {
    expect(daysElapsed(MAY, new Date(2025, 0, 1))).toBe(31);
  });
});

describe('wholePercentages', () => {
  it('always sums to exactly 100', () => {
    for (const values of [
      [1, 1, 1],
      [16_200, 12_340, 5_100, 8_040],
      [999, 1],
      [3, 3, 3, 3, 3, 3, 3],
    ]) {
      expect(wholePercentages(values).reduce((a, b) => a + b, 0)).toBe(100);
    }
  });

  it('gives a single category 100%', () => {
    expect(wholePercentages([42])).toEqual([100]);
  });

  it('gives remainders to the largest fraction, then the larger value', () => {
    expect(wholePercentages([1, 1, 1])).toEqual([34, 33, 33]);
    expect(wholePercentages([16_200, 12_340, 5_100, 8_040])).toEqual([39, 30, 12, 19]);
  });

  it('returns zeros when the total is zero', () => {
    expect(wholePercentages([0, 0])).toEqual([0, 0]);
  });
});

describe('buildCategoryBreakdown', () => {
  const rows: CategoryTotalRow[] = [
    { category: category(2, 'shopping'), totalMinor: 1_234_000, count: 4 },
    { category: category(1, 'food'), totalMinor: 1_620_000, count: 9 },
    { category: category(3, 'transport'), totalMinor: 510_000, count: 3 },
    { category: category(4, 'others'), totalMinor: 804_000, count: 2 },
  ];

  it('sorts by amount descending with percentages, counts and fractions', () => {
    const shares = buildCategoryBreakdown(rows);
    expect(shares.map((s) => s.category.key)).toEqual(['food', 'shopping', 'others', 'transport']);
    expect(shares.map((s) => s.percent)).toEqual([39, 30, 19, 12]);
    expect(shares.reduce((sum, s) => sum + s.percent, 0)).toBe(100);
    expect(shares[0]?.count).toBe(9);
    expect(shares.reduce((sum, s) => sum + s.fraction, 0)).toBeCloseTo(1, 10);
  });

  it('breaks amount ties by category sort order', () => {
    const tied = buildCategoryBreakdown([
      { category: category(5, 'b', 2), totalMinor: 100, count: 1 },
      { category: category(6, 'a', 1), totalMinor: 100, count: 1 },
    ]);
    expect(tied.map((s) => s.category.key)).toEqual(['a', 'b']);
    expect(tied.map((s) => s.percent)).toEqual([50, 50]);
  });

  it('is empty for no rows', () => {
    expect(buildCategoryBreakdown([])).toEqual([]);
  });
});

describe('trends', () => {
  it('fills every day of the month with zeros', () => {
    const trend = buildDailyTrend(MAY, []);
    expect(trend.granularity).toBe('day');
    expect(trend.points).toHaveLength(31);
    expect(trend.points.every((p) => p.expenseMinor === 0 && p.incomeMinor === 0)).toBe(true);
  });

  it('places daily totals on their dates and ignores rows outside the range', () => {
    const trend = buildDailyTrend(MAY, [
      expenseDay('2025-05-01', 500, 2),
      { date: '2025-05-01', type: 'income', totalMinor: 9_000, count: 1 },
      expenseDay('2025-05-31', 700),
      expenseDay('2025-06-01', 99_999),
    ]);
    expect(trend.points[0]).toMatchObject({
      key: '2025-05-01',
      expenseMinor: 500,
      incomeMinor: 9_000,
      count: 3,
    });
    expect(trend.points[30]?.expenseMinor).toBe(700);
    expect(trend.points.reduce((sum, p) => sum + p.expenseMinor, 0)).toBe(1_200);
  });

  it('handles a single-day range', () => {
    const trend = buildDailyTrend({ from: '2025-05-10', to: '2025-05-10' }, [
      expenseDay('2025-05-10', 300),
    ]);
    expect(trend.points).toEqual([
      { key: '2025-05-10', start: '2025-05-10', incomeMinor: 0, expenseMinor: 300, count: 1 },
    ]);
  });

  it('uses monthly points for a year and clips the first month start to the range', () => {
    expect(trendGranularity({ from: '2025-01-01', to: '2025-12-31' })).toBe('month');
    expect(trendGranularity(MAY)).toBe('day');
    const trend = buildMonthlyTrend({ from: '2025-01-15', to: '2025-12-31' }, [
      { month: '2025-03', type: 'expense', totalMinor: 1_000, count: 2 },
    ]);
    expect(trend.points).toHaveLength(12);
    expect(trend.points[0]?.start).toBe('2025-01-15');
    expect(trend.points[2]).toMatchObject({ key: '2025-03', start: '2025-03-01', count: 2 });
  });
});

describe('comparison', () => {
  it('computes increase and decrease percentages', () => {
    expect(compareMetric(15_000, 10_000)).toEqual({
      currentMinor: 15_000,
      previousMinor: 10_000,
      deltaMinor: 5_000,
      changeBp: 5_000,
      direction: 'up',
    });
    expect(compareMetric(7_500, 10_000)).toMatchObject({ changeBp: -2_500, direction: 'down' });
    expect(compareMetric(10_000, 10_000)).toMatchObject({ changeBp: 0, direction: 'same' });
  });

  it('gives no percentage when the previous value is zero', () => {
    expect(compareMetric(5_000, 0)).toMatchObject({ changeBp: null, direction: 'up' });
    expect(compareMetric(0, 0)).toMatchObject({ changeBp: null, direction: 'same' });
  });

  it('uses the magnitude of a negative previous net balance', () => {
    expect(compareMetric(-500, -1_000)).toMatchObject({ changeBp: 5_000, direction: 'up' });
  });

  it('compares income, expenses and net and flags missing previous data', () => {
    const range = { from: '2025-04-01', to: '2025-04-30' };
    const result = comparePeriods(toTypeTotals(typeRows(100_000, 40_000)), toTypeTotals([]), range);
    expect(result.hasPreviousData).toBe(false);
    expect(result.previousRange).toBe(range);
    expect(result.expense.changeBp).toBeNull();
    expect(result.net).toMatchObject({ currentMinor: 60_000, previousMinor: 0 });
  });
});

describe('buildCalendarMonth', () => {
  it('builds whole Sunday-first weeks with leading and trailing days', () => {
    const cal = buildCalendarMonth(new Date(2025, 4, 1), [], new Date(2025, 4, 22));
    expect(cal.days).toHaveLength(35); // 27 Apr – 31 May
    expect(cal.days[0]).toMatchObject({ date: '2025-04-27', inMonth: false });
    expect(cal.days[4]).toMatchObject({ date: '2025-05-01', inMonth: true });
    expect(cal.days[34]).toMatchObject({ date: '2025-05-31', inMonth: true });
    expect(cal.days.filter((d) => d.isToday).map((d) => d.date)).toEqual(['2025-05-22']);
  });

  it('handles February in a leap year', () => {
    const cal = buildCalendarMonth(new Date(2024, 1, 1), [], new Date(2020, 0, 1));
    expect(cal.days.filter((d) => d.inMonth)).toHaveLength(29);
    expect(cal.days.length % 7).toBe(0);
    expect(cal.days.some((d) => d.isToday)).toBe(false);
  });

  it('puts daily totals on in-month days and sums the month', () => {
    const cal = buildCalendarMonth(
      new Date(2025, 4, 1),
      [
        expenseDay('2025-05-22', 68_000, 2),
        { date: '2025-05-01', type: 'income', totalMinor: 7_500_000, count: 1 },
      ],
      new Date(2025, 4, 22),
    );
    expect(cal.days.find((d) => d.date === '2025-05-22')).toMatchObject({
      expenseMinor: 68_000,
      count: 2,
    });
    expect(cal.incomeMinor).toBe(7_500_000);
    expect(cal.expenseMinor).toBe(68_000);
  });
});
