import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfYear,
  startOfMonth,
  startOfYear,
  subDays,
} from 'date-fns';

import {
  fromIsoDate,
  getMonthRange,
  isIsoDate,
  toIsoDate,
  type DateRange,
  type IsoDate,
} from '@/utils/dates';

import type { ReportPeriod, ReportPreset } from './types';

export function monthPeriod(date: Date): ReportPeriod {
  return { kind: 'month', month: toIsoDate(startOfMonth(date)) };
}

export function yearPeriod(date: Date): ReportPeriod {
  return { kind: 'year', year: date.getFullYear() };
}

export function presetPeriod(preset: Exclude<ReportPreset, 'custom'>, today: Date): ReportPeriod {
  switch (preset) {
    case 'thisMonth':
      return monthPeriod(today);
    case 'lastMonth':
      return monthPeriod(addMonths(today, -1));
    case 'thisYear':
      return yearPeriod(today);
  }
}

/** Which preset chip a period corresponds to, relative to `today`. Null for other months/years. */
export function activePreset(period: ReportPeriod, today: Date): ReportPreset | null {
  if (period.kind === 'custom') return 'custom';
  if (period.kind === 'year') return period.year === today.getFullYear() ? 'thisYear' : null;
  const thisMonth = toIsoDate(startOfMonth(today));
  if (period.month === thisMonth) return 'thisMonth';
  if (period.month === toIsoDate(startOfMonth(addMonths(today, -1)))) return 'lastMonth';
  return null;
}

/** Inclusive local date range a period covers. */
export function resolveRange(period: ReportPeriod): DateRange {
  switch (period.kind) {
    case 'month':
      return getMonthRange(fromIsoDate(period.month));
    case 'year': {
      const date = new Date(period.year, 0, 1);
      return { from: toIsoDate(startOfYear(date)), to: toIsoDate(endOfYear(date)) };
    }
    case 'custom':
      return { from: period.from, to: period.to };
  }
}

/** Number of calendar days in an inclusive range. */
export function rangeLength(range: DateRange): number {
  return differenceInCalendarDays(fromIsoDate(range.to), fromIsoDate(range.from)) + 1;
}

/**
 * The period compared against: previous month, previous year, or for a custom range the
 * equally long range ending the day before it starts.
 */
export function previousRange(period: ReportPeriod): DateRange {
  switch (period.kind) {
    case 'month':
      return getMonthRange(addMonths(fromIsoDate(period.month), -1));
    case 'year':
      return resolveRange({ kind: 'year', year: period.year - 1 });
    case 'custom': {
      const from = fromIsoDate(period.from);
      const length = rangeLength(period);
      return { from: toIsoDate(subDays(from, length)), to: toIsoDate(subDays(from, 1)) };
    }
  }
}

/** Steps a month/year period by `direction`; custom ranges cannot be stepped. */
export function shiftPeriod(period: ReportPeriod, direction: 1 | -1): ReportPeriod {
  switch (period.kind) {
    case 'month':
      return monthPeriod(addMonths(fromIsoDate(period.month), direction));
    case 'year':
      return { kind: 'year', year: period.year + direction };
    case 'custom':
      return period;
  }
}

/** True when stepping forward would start after `today` (nothing to report yet). */
export function isAtOrAfterToday(period: ReportPeriod, today: Date): boolean {
  return resolveRange(period).to >= toIsoDate(today);
}

export type CustomRangeError = 'missing' | 'invalidDate' | 'endBeforeStart';

/** Validates a user-picked custom range. Both ends are required and inclusive. */
export function validateCustomRange(
  from: IsoDate | null,
  to: IsoDate | null,
): CustomRangeError | null {
  if (!from || !to) return 'missing';
  if (!isIsoDate(from) || !isIsoDate(to)) return 'invalidDate';
  if (from > to) return 'endBeforeStart';
  return null;
}

/** Every calendar day of an inclusive range, in order. */
export function eachDay(range: DateRange): IsoDate[] {
  const start = fromIsoDate(range.from);
  const length = rangeLength(range);
  return Array.from({ length: Math.max(length, 0) }, (_, i) => toIsoDate(addDays(start, i)));
}
