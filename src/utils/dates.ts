import { differenceInCalendarDays, format, parseISO, type Locale } from 'date-fns';
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
 * "May 2025" / "মে ২০২৫" etc. Uses a date-fns locale when one exists, otherwise Intl,
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
