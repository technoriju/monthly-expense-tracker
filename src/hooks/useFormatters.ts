import { useSettingsStore } from '@/store/settingsStore';
import type { MinorAmount } from '@/types/money';
import {
  formatDayOfMonth,
  formatLongDate,
  formatMonthShort,
  formatMonthYear,
  formatShortDate,
  formatWeekdayShort,
  type IsoDate,
} from '@/utils/dates';
import { formatMoney, formatPercentBp, type SignDisplay } from '@/utils/format';

import { useActiveLanguage } from './useActiveLanguage';

/** Locale-aware display formatters bound to the active UI language and currency. */
export function useFormatters() {
  const language = useActiveLanguage();
  const currency = useSettingsStore((s) => s.currency);

  return {
    money: (amountMinor: MinorAmount, signDisplay?: SignDisplay) =>
      formatMoney(amountMinor, currency, language.locale, { signDisplay }),
    monthYear: (date: Date) => formatMonthYear(date, language.code, language.locale),
    monthShort: (date: Date) => formatMonthShort(date, language.code),
    shortDate: (isoDate: IsoDate) => formatShortDate(isoDate, language.code),
    longDate: (isoDate: IsoDate) => formatLongDate(isoDate, language.code),
    weekdayShort: (date: Date) => formatWeekdayShort(date, language.code),
    dayOfMonth: (isoDate: IsoDate) => formatDayOfMonth(isoDate, language.code),
    percentBp: (basisPoints: number, signDisplay?: SignDisplay) =>
      formatPercentBp(basisPoints, language.locale, { signDisplay }),
  };
}
