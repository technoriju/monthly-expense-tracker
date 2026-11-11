/**
 * Pure report math. No I/O, no React. All money is integer minor units (paise); the only
 * floating-point results are display ratios (savings rate, % change, chart fractions).
 */
import { addMonths, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns';

import type { MinorAmount } from '@/types/money';
import { fromIsoDate, toIsoDate, type DateRange, type IsoDate } from '@/utils/dates';

import { eachDay, rangeLength } from './period';
import type {
  CalendarMonth,
  CategoryShare,
  CategoryTotalRow,
  ChangeDirection,
  DailyTotalRow,
  DayAmount,
  MetricComparison,
  MonthlyTotalRow,
  PeriodComparison,
  ReportSummary,
  Trend,
  TrendPoint,
  TypeTotalRow,
} from './types';

/** Ranges longer than this are charted per month instead of per day. */
export const MAX_DAILY_TREND_DAYS = 62;

const BASIS_POINTS = 10_000;

export interface TypeTotals {
  incomeMinor: MinorAmount;
  expenseMinor: MinorAmount;
  incomeCount: number;
  expenseCount: number;
}

export function toTypeTotals(rows: readonly TypeTotalRow[]): TypeTotals {
  const totals: TypeTotals = { incomeMinor: 0, expenseMinor: 0, incomeCount: 0, expenseCount: 0 };
  for (const row of rows) {
    if (row.type === 'income') {
      totals.incomeMinor += row.totalMinor;
      totals.incomeCount += row.count;
    } else {
      totals.expenseMinor += row.totalMinor;
      totals.expenseCount += row.count;
    }
  }
  return totals;
}

/** saved / income in basis points, or null when there is no income to compare against. */
export function savingsRateBp(savedMinor: MinorAmount, incomeMinor: MinorAmount): number | null {
  if (incomeMinor <= 0) return null;
  return Math.round((savedMinor / incomeMinor) * BASIS_POINTS);
}

/**
 * Days the daily average is spread over: the whole range for past (or future) periods,
 * up to and including today for the period containing today.
 */
export function daysElapsed(range: DateRange, today: Date): number {
  const todayIso = toIsoDate(today);
  if (todayIso < range.from || todayIso > range.to) return rangeLength(range);
  return rangeLength({ from: range.from, to: todayIso });
}

function expenseDays(daily: readonly DailyTotalRow[]): DayAmount[] {
  return daily
    .filter((row) => row.type === 'expense' && row.totalMinor > 0)
    .map((row) => ({ date: row.date, amountMinor: row.totalMinor }));
}

export function summarize(
  typeRows: readonly TypeTotalRow[],
  daily: readonly DailyTotalRow[],
  range: DateRange,
  today: Date,
): ReportSummary {
  const totals = toTypeTotals(typeRows);
  const netBalanceMinor = totals.incomeMinor - totals.expenseMinor;
  const savedMinor = Math.max(netBalanceMinor, 0);
  const daysCounted = daysElapsed(range, today);

  // Earliest date wins ties (rows arrive sorted by date).
  let highest: DayAmount | null = null;
  let lowest: DayAmount | null = null;
  for (const day of expenseDays(daily)) {
    if (!highest || day.amountMinor > highest.amountMinor) highest = day;
    if (!lowest || day.amountMinor < lowest.amountMinor) lowest = day;
  }

  return {
    ...totals,
    netBalanceMinor,
    savedMinor,
    savingsRateBp: savingsRateBp(savedMinor, totals.incomeMinor),
    transactionCount: totals.incomeCount + totals.expenseCount,
    avgDailyExpenseMinor: daysCounted > 0 ? Math.round(totals.expenseMinor / daysCounted) : 0,
    daysCounted,
    highestExpenseDay: highest,
    lowestExpenseDay: lowest,
  };
}

/**
 * Whole percentages that sum to exactly 100 (largest-remainder method), computed with
 * integer arithmetic. Ties in remainder go to the larger value, then to the earlier item.
 */
export function wholePercentages(values: readonly MinorAmount[]): number[] {
  const total = values.reduce((sum, v) => sum + v, 0);
  if (total <= 0) return values.map(() => 0);
  const floors = values.map((v) => Math.floor((v * 100) / total));
  const order = values
    .map((v, index) => ({ index, value: v, remainder: (v * 100) % total }))
    .sort((a, b) => b.remainder - a.remainder || b.value - a.value || a.index - b.index);
  let missing = 100 - floors.reduce((sum, p) => sum + p, 0);
  for (const item of order) {
    if (missing <= 0) break;
    floors[item.index] = (floors[item.index] ?? 0) + 1;
    missing -= 1;
  }
  return floors;
}

/** Category shares of one type, largest first. */
export function buildCategoryBreakdown(rows: readonly CategoryTotalRow[]): CategoryShare[] {
  const sorted = rows
    .filter((row) => row.totalMinor > 0)
    .sort(
      (a, b) =>
        b.totalMinor - a.totalMinor ||
        a.category.sortOrder - b.category.sortOrder ||
        a.category.id - b.category.id,
    );
  const total = sorted.reduce((sum, row) => sum + row.totalMinor, 0);
  const percents = wholePercentages(sorted.map((row) => row.totalMinor));
  return sorted.map((row, i) => ({
    category: row.category,
    totalMinor: row.totalMinor,
    count: row.count,
    percent: percents[i] ?? 0,
    fraction: total > 0 ? row.totalMinor / total : 0,
  }));
}

export function trendGranularity(range: DateRange): Trend['granularity'] {
  return rangeLength(range) <= MAX_DAILY_TREND_DAYS ? 'day' : 'month';
}

/** One point per day of the range, zero-filled. */
export function buildDailyTrend(range: DateRange, daily: readonly DailyTotalRow[]): Trend {
  const byDate = new Map<IsoDate, TrendPoint>();
  const points = eachDay(range).map((date) => {
    const point: TrendPoint = { key: date, start: date, incomeMinor: 0, expenseMinor: 0, count: 0 };
    byDate.set(date, point);
    return point;
  });
  for (const row of daily) {
    const point = byDate.get(row.date);
    if (!point) continue;
    if (row.type === 'income') point.incomeMinor += row.totalMinor;
    else point.expenseMinor += row.totalMinor;
    point.count += row.count;
  }
  return { granularity: 'day', points };
}

/** One point per calendar month touched by the range, zero-filled. */
export function buildMonthlyTrend(range: DateRange, monthly: readonly MonthlyTotalRow[]): Trend {
  const byMonth = new Map<string, TrendPoint>();
  const points: TrendPoint[] = [];
  const last = startOfMonth(fromIsoDate(range.to));
  for (let m = startOfMonth(fromIsoDate(range.from)); m <= last; m = addMonths(m, 1)) {
    const monthStart = toIsoDate(m);
    const key = monthStart.slice(0, 7);
    const point: TrendPoint = {
      key,
      start: monthStart < range.from ? range.from : monthStart,
      incomeMinor: 0,
      expenseMinor: 0,
      count: 0,
    };
    byMonth.set(key, point);
    points.push(point);
  }
  for (const row of monthly) {
    const point = byMonth.get(row.month);
    if (!point) continue;
    if (row.type === 'income') point.incomeMinor += row.totalMinor;
    else point.expenseMinor += row.totalMinor;
    point.count += row.count;
  }
  return { granularity: 'month', points };
}

export function compareMetric(current: MinorAmount, previous: MinorAmount): MetricComparison {
  const deltaMinor = current - previous;
  const direction: ChangeDirection = deltaMinor > 0 ? 'up' : deltaMinor < 0 ? 'down' : 'same';
  return {
    currentMinor: current,
    previousMinor: previous,
    deltaMinor,
    changeBp: previous === 0 ? null : Math.round((deltaMinor / Math.abs(previous)) * BASIS_POINTS),
    direction,
  };
}

export function comparePeriods(
  current: TypeTotals,
  previous: TypeTotals,
  previousRange: DateRange,
): PeriodComparison {
  return {
    previousRange,
    hasPreviousData: previous.incomeCount + previous.expenseCount > 0,
    income: compareMetric(current.incomeMinor, previous.incomeMinor),
    expense: compareMetric(current.expenseMinor, previous.expenseMinor),
    net: compareMetric(
      current.incomeMinor - current.expenseMinor,
      previous.incomeMinor - previous.expenseMinor,
    ),
  };
}

/** Whole-week grid (Sunday first) for `month` with daily totals and a today flag. */
export function buildCalendarMonth(
  month: Date,
  daily: readonly DailyTotalRow[],
  today: Date,
): CalendarMonth {
  const first = startOfMonth(month);
  const monthKey = toIsoDate(first).slice(0, 7);
  const todayIso = toIsoDate(today);
  const range = {
    from: toIsoDate(startOfWeek(first, { weekStartsOn: 0 })),
    to: toIsoDate(endOfWeek(endOfMonth(first), { weekStartsOn: 0 })),
  };
  const trend = buildDailyTrend(range, daily);
  let incomeMinor = 0;
  let expenseMinor = 0;
  const days = trend.points.map((p) => {
    const inMonth = p.key.startsWith(monthKey);
    if (inMonth) {
      incomeMinor += p.incomeMinor;
      expenseMinor += p.expenseMinor;
    }
    return {
      date: p.key,
      inMonth,
      isToday: p.key === todayIso,
      incomeMinor: inMonth ? p.incomeMinor : 0,
      expenseMinor: inMonth ? p.expenseMinor : 0,
      count: inMonth ? p.count : 0,
    };
  });
  return { month: toIsoDate(first), days, incomeMinor, expenseMinor };
}
