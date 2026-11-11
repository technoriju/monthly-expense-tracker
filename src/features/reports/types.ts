import type { Category } from '@/features/categories/types';
import type { MinorAmount, TransactionType } from '@/types/money';
import type { DateRange, IsoDate } from '@/utils/dates';

/** Raw aggregation rows returned by `reportRepository`. */
export interface TypeTotalRow {
  type: TransactionType;
  totalMinor: MinorAmount;
  count: number;
}

export interface CategoryTotalRow {
  category: Category;
  totalMinor: MinorAmount;
  count: number;
}

export interface DailyTotalRow {
  date: IsoDate;
  type: TransactionType;
  totalMinor: MinorAmount;
  count: number;
}

export interface MonthlyTotalRow {
  /** 'YYYY-MM' */
  month: string;
  type: TransactionType;
  totalMinor: MinorAmount;
  count: number;
}

/** The single date filter shared by every report screen and the CSV export. */
export type ReportPeriod =
  | { kind: 'month'; /** First day of the month. */ month: IsoDate }
  | { kind: 'year'; year: number }
  | { kind: 'custom'; from: IsoDate; to: IsoDate };

export type ReportPreset = 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';

export interface DayAmount {
  date: IsoDate;
  amountMinor: MinorAmount;
}

export interface ReportSummary {
  incomeMinor: MinorAmount;
  expenseMinor: MinorAmount;
  /** income − expense for the period (may be negative). Not an account balance. */
  netBalanceMinor: MinorAmount;
  /** Part of this period's income left unspent: max(net, 0). */
  savedMinor: MinorAmount;
  /** saved / income in basis points (10000 = 100%); null when there is no income. */
  savingsRateBp: number | null;
  incomeCount: number;
  expenseCount: number;
  transactionCount: number;
  /** Expense divided by the days elapsed in the period (to today for the current period). */
  avgDailyExpenseMinor: MinorAmount;
  /** Days used for the average. */
  daysCounted: number;
  highestExpenseDay: DayAmount | null;
  /** Lowest among days that had any expense. */
  lowestExpenseDay: DayAmount | null;
}

export interface CategoryShare {
  category: Category;
  totalMinor: MinorAmount;
  count: number;
  /** Whole percent of the type total; all shares sum to exactly 100 (largest remainder). */
  percent: number;
  /** Exact fraction of the type total (0–1), for chart geometry only. */
  fraction: number;
}

export type TrendGranularity = 'day' | 'month';

export interface TrendPoint {
  /** IsoDate for daily points, 'YYYY-MM' for monthly points. */
  key: string;
  /** First calendar day the point covers. */
  start: IsoDate;
  incomeMinor: MinorAmount;
  expenseMinor: MinorAmount;
  count: number;
}

export interface Trend {
  granularity: TrendGranularity;
  points: TrendPoint[];
}

export type ChangeDirection = 'up' | 'down' | 'same';

export interface MetricComparison {
  currentMinor: MinorAmount;
  previousMinor: MinorAmount;
  deltaMinor: MinorAmount;
  /** Change relative to |previous| in basis points; null when previous is 0 (no baseline). */
  changeBp: number | null;
  direction: ChangeDirection;
}

export interface PeriodComparison {
  previousRange: DateRange;
  /** False when the previous period has no transactions at all. */
  hasPreviousData: boolean;
  income: MetricComparison;
  expense: MetricComparison;
  net: MetricComparison;
}

export interface Report {
  range: DateRange;
  summary: ReportSummary;
  expenseCategories: CategoryShare[];
  incomeCategories: CategoryShare[];
  trend: Trend;
  comparison: PeriodComparison;
}

export interface CalendarDay {
  date: IsoDate;
  /** False for leading/trailing days of neighbouring months. */
  inMonth: boolean;
  isToday: boolean;
  incomeMinor: MinorAmount;
  expenseMinor: MinorAmount;
  count: number;
}

export interface CalendarMonth {
  /** First day of the month. */
  month: IsoDate;
  /** Whole weeks, Sunday first. */
  days: CalendarDay[];
  incomeMinor: MinorAmount;
  expenseMinor: MinorAmount;
}
