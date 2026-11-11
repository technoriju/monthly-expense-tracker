import { reportRepository, transactionRepository } from '@/database';
import type { Transaction } from '@/features/transactions/types';
import { useSettingsStore } from '@/store/settingsStore';
import { getMonthRange, type DateRange, type IsoDate } from '@/utils/dates';

import {
  buildCalendarMonth,
  buildCategoryBreakdown,
  buildDailyTrend,
  buildMonthlyTrend,
  comparePeriods,
  summarize,
  toTypeTotals,
  trendGranularity,
} from '../analytics';
import { previousRange, resolveRange } from '../period';
import type { CalendarMonth, Report, ReportPeriod, Trend } from '../types';

/** Upper bound for one day's transaction list on the calendar. */
const DAY_TRANSACTIONS_LIMIT = 200;

function activeCurrency() {
  return useSettingsStore.getState().currency;
}

async function getTrend(range: DateRange): Promise<Trend> {
  const currency = activeCurrency();
  if (trendGranularity(range) === 'day') {
    return buildDailyTrend(
      range,
      await reportRepository.getDailyTotals(range.from, range.to, currency),
    );
  }
  return buildMonthlyTrend(
    range,
    await reportRepository.getMonthlyTotals(range.from, range.to, currency),
  );
}

/**
 * Report shaping: every figure for one period comes from the same date range and the
 * active currency, so summary, breakdowns and charts always agree.
 */
export const reportService = {
  async getReport(period: ReportPeriod, today: Date = new Date()): Promise<Report> {
    const currency = activeCurrency();
    const range = resolveRange(period);
    const prevRange = previousRange(period);
    const granularity = trendGranularity(range);

    const [typeRows, prevTypeRows, expenseRows, incomeRows, daily, monthly] = await Promise.all([
      reportRepository.getTypeTotals(range.from, range.to, currency),
      reportRepository.getTypeTotals(prevRange.from, prevRange.to, currency),
      reportRepository.getCategoryTotals(range.from, range.to, currency, 'expense'),
      reportRepository.getCategoryTotals(range.from, range.to, currency, 'income'),
      reportRepository.getDailyTotals(range.from, range.to, currency),
      granularity === 'month'
        ? reportRepository.getMonthlyTotals(range.from, range.to, currency)
        : Promise.resolve([]),
    ]);

    return {
      range,
      summary: summarize(typeRows, daily, range, today),
      expenseCategories: buildCategoryBreakdown(expenseRows),
      incomeCategories: buildCategoryBreakdown(incomeRows),
      trend:
        granularity === 'day' ? buildDailyTrend(range, daily) : buildMonthlyTrend(range, monthly),
      comparison: comparePeriods(toTypeTotals(typeRows), toTypeTotals(prevTypeRows), prevRange),
    };
  },

  /** Daily totals for one month (used by the dashboard trend chart). */
  getMonthTrend(month: Date): Promise<Trend> {
    return getTrend(getMonthRange(month));
  },

  async getCalendarMonth(month: Date, today: Date = new Date()): Promise<CalendarMonth> {
    const { from, to } = getMonthRange(month);
    const daily = await reportRepository.getDailyTotals(from, to, activeCurrency());
    return buildCalendarMonth(month, daily, today);
  },

  /** Transactions on one date in the active currency, newest first. */
  async getDayTransactions(date: IsoDate): Promise<Transaction[]> {
    const currency = activeCurrency();
    const rows = await transactionRepository.list(
      { dateFrom: date, dateTo: date },
      { limit: DAY_TRANSACTIONS_LIMIT, offset: 0 },
    );
    return rows.filter((tx) => tx.currency === currency);
  },
};
