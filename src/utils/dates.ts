import {
  differenceInCalendarDays,
  endOfMonth,
  format,
  isValid,
  parseISO,
  startOfMonth,
  type Locale,
} from 'date-fns';
import { bn, enIN, hi } from 'date-fns/locale';

import type { LanguageCode } from '@/i18n/languages';

/** Local calendar date string 'YYYY-MM-DD' (no timezone). */
export type IsoDate = string;

const DATE_FNS_LOCALES: Partial<Record<LanguageCode, Locale>> = { en: enIN, bn, hi };

export function toIsoDate(date: Date): IsoDate {
  return format(date, 'yyyy-MM-dd');
}

export type GreetingKey = 'morning' | 'afternoon' | 'evening';

export function getGreetingKey(date: Date): GreetingKey {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
}

/**
 * "May 2025" / "মে 2025" etc. (digits stay Latin in every language). Uses a date-fns locale when one exists, otherwise Intl,
 * otherwise English.
 */
export function formatMonthYear(date: Date, language: LanguageCode, intlLocale: string): string {
  const fnsLocale = DATE_FNS_LOCALES[language];
  if (fnsLocale) return format(date, 'LLLL yyyy', { locale: fnsLocale });
  try {
    return new Intl.DateTimeFormat(intlLocale, { month: 'long', year: 'numeric' }).format(date);
  } catch {
    return format(date, 'LLLL yyyy');
  }
}

/** "22 May" style short date for list rows. */
export function formatShortDate(isoDate: IsoDate, language: LanguageCode): string {
  return format(parseISO(isoDate), 'd MMM', { locale: DATE_FNS_LOCALES[language] ?? enIN });
}

export type RelativeDayKey = 'today' | 'yesterday';

export function getRelativeDayKey(isoDate: IsoDate, today: Date): RelativeDayKey | null {
  const diff = differenceInCalendarDays(today, parseISO(isoDate));
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  return null;
}

export interface DateRange {
  from: IsoDate;
  to: IsoDate;
}

/** First and last calendar day of `date`'s month as ISO date strings. */
export function getMonthRange(date: Date): DateRange {
  return { from: toIsoDate(startOfMonth(date)), to: toIsoDate(endOfMonth(date)) };
}

/** Parses 'YYYY-MM-DD' as a local date (midnight). */
export function fromIsoDate(isoDate: IsoDate): Date {
  return parseISO(isoDate);
}

/** True for a real calendar date in 'YYYY-MM-DD' form. */
export function isIsoDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    isValid(parseISO(value)) &&
    toIsoDate(parseISO(value)) === value
  );
}

/** "22 May 2025" style date for form fields and list group headers. */
export function formatLongDate(isoDate: IsoDate, language: LanguageCode): string {
  return format(parseISO(isoDate), 'd MMMM yyyy', { locale: DATE_FNS_LOCALES[language] ?? enIN });
}

/** Short month name ("Jan", "জানু") for month pickers. */
export function formatMonthShort(date: Date, language: LanguageCode): string {
  return format(date, 'LLL', { locale: DATE_FNS_LOCALES[language] ?? enIN });
}

/** Short weekday name ("Sun", "রবি", "रवि") for calendar headers. */
export function formatWeekdayShort(date: Date, language: LanguageCode): string {
  return format(date, 'EEE', { locale: DATE_FNS_LOCALES[language] ?? enIN });
}

/** Day of month ("22") for calendar cells and chart axis labels. */
export function formatDayOfMonth(isoDate: IsoDate, language: LanguageCode): string {
  return format(parseISO(isoDate), 'd', { locale: DATE_FNS_LOCALES[language] ?? enIN });
}
