import { categoryRepository } from '@/database';
import {
  createMigratedTestDatabase,
  type TestDatabase,
} from '@/database/testing/createTestDatabase';
import { transactionService } from '@/features/transactions/services/transactionService';
import type { TransactionInput } from '@/features/transactions/types';

import { reportService } from '../services/reportService';
import type { ReportPeriod } from '../types';

let mockDb: TestDatabase;

jest.mock('@/database/client', () => ({
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
  type: TransactionInput['type'] = 'expense',
): Promise<void> {
  await transactionService.create({
    type,
    amountMinor,
    categoryId: await idOf(key),
    occurredOn,
    note: null,
    paymentMethod: null,
  });
}

const MAY: ReportPeriod = { kind: 'month', month: '2025-05-01' };
const LATER = new Date(2025, 6, 1);

describe('reportService.getReport', () => {
  it('returns an empty report for a month without transactions', async () => {
    const report = await reportService.getReport(MAY, LATER);
    expect(report.summary.transactionCount).toBe(0);
    expect(report.summary.savingsRateBp).toBeNull();
    expect(report.expenseCategories).toEqual([]);
    expect(report.incomeCategories).toEqual([]);
    expect(report.trend.points).toHaveLength(31);
    expect(report.comparison.hasPreviousData).toBe(false);
  });

  it('keeps summary, categories and daily trend consistent for the same range', async () => {
    await add('salary', 7_500_000, '2025-05-01', 'income');
    await add('food', 1_620_000, '2025-05-03');
    await add('shopping', 1_234_000, '2025-05-10');
    await add('transportation', 510_000, '2025-05-10');
    await add('other_expense', 804_000, '2025-05-31');
    await add('food', 999_999, '2025-06-01'); // outside the month

    const report = await reportService.getReport(MAY, LATER);
    const { summary } = report;
    const categoryTotal = report.expenseCategories.reduce((s, c) => s + c.totalMinor, 0);
    const trendTotal = report.trend.points.reduce((s, p) => s + p.expenseMinor, 0);

    expect(summary.expenseMinor).toBe(4_168_000);
    expect(categoryTotal).toBe(summary.expenseMinor);
    expect(trendTotal).toBe(summary.expenseMinor);
    expect(report.expenseCategories.reduce((s, c) => s + c.percent, 0)).toBe(100);
    expect(report.expenseCategories[0]?.category.key).toBe('food');
    expect(report.incomeCategories.map((c) => [c.category.key, c.percent])).toEqual([
      ['salary', 100],
    ]);
    expect(summary.netBalanceMinor).toBe(3_332_000);
    expect(summary.highestExpenseDay).toEqual({ date: '2025-05-10', amountMinor: 1_744_000 });

    // Dashboard totals come from transactionService and must match the report.
    const dashboard = await transactionService.getMonthlyTotals(new Date(2025, 4, 1));
    expect(dashboard).toEqual({
      incomeMinor: summary.incomeMinor,
      expenseMinor: summary.expenseMinor,
      balanceMinor: summary.netBalanceMinor,
    });
  });

  it('compares with the previous month', async () => {
    await add('food', 100_000, '2025-04-15');
    await add('food', 150_000, '2025-05-15');
    const { comparison } = await reportService.getReport(MAY, LATER);
    expect(comparison.previousRange).toEqual({ from: '2025-04-01', to: '2025-04-30' });
    expect(comparison.hasPreviousData).toBe(true);
    expect(comparison.expense).toMatchObject({ deltaMinor: 50_000, changeBp: 5_000 });
    expect(comparison.income.changeBp).toBeNull();
  });

  it('filters every figure by a custom range', async () => {
    await add('food', 1_000, '2025-05-09');
    await add('food', 2_000, '2025-05-10');
    await add('food', 4_000, '2025-05-12');
    await add('food', 8_000, '2025-05-13');
    const report = await reportService.getReport(
      { kind: 'custom', from: '2025-05-10', to: '2025-05-12' },
      LATER,
    );
    expect(report.summary.expenseMinor).toBe(6_000);
    expect(report.trend.points.map((p) => p.expenseMinor)).toEqual([2_000, 0, 4_000]);
    expect(report.expenseCategories[0]?.totalMinor).toBe(6_000);
    expect(report.comparison.previousRange).toEqual({ from: '2025-05-07', to: '2025-05-09' });
    expect(report.comparison.expense.previousMinor).toBe(1_000);
  });

  it('charts a year by month', async () => {
    await add('food', 1_000, '2025-02-10');
    await add('food', 3_000, '2025-11-30');
    const report = await reportService.getReport({ kind: 'year', year: 2025 }, LATER);
    expect(report.trend.granularity).toBe('month');
    expect(report.trend.points).toHaveLength(12);
    expect(report.trend.points[1]?.expenseMinor).toBe(1_000);
    expect(report.trend.points[10]?.expenseMinor).toBe(3_000);
    expect(report.summary.daysCounted).toBe(182); // 1 Jan – 1 Jul 2025
  });
});

describe('reportService calendar', () => {
  it('returns the month grid and a day’s transactions', async () => {
    await add('food', 68_000, '2025-05-22');
    await add('salary', 5_000_000, '2025-05-22', 'income');
    const cal = await reportService.getCalendarMonth(new Date(2025, 4, 1), LATER);
    expect(cal.days.find((d) => d.date === '2025-05-22')).toMatchObject({
      incomeMinor: 5_000_000,
      expenseMinor: 68_000,
      count: 2,
    });
    const day = await reportService.getDayTransactions('2025-05-22');
    expect(day).toHaveLength(2);
    expect(await reportService.getDayTransactions('2025-05-23')).toEqual([]);
  });

  it('gives the dashboard a daily trend for the month', async () => {
    await add('food', 700, '2025-05-02');
    const trend = await reportService.getMonthTrend(new Date(2025, 4, 1));
    expect(trend.granularity).toBe('day');
    expect(trend.points[1]?.expenseMinor).toBe(700);
  });
});
