import { useSettingsStore } from '@/store/settingsStore';
import type { MinorAmount } from '@/types/money';
import { formatMonthYear, formatShortDate, type IsoDate } from '@/utils/dates';
import { formatMoney, type SignDisplay } from '@/utils/format';

import { useActiveLanguage } from './useActiveLanguage';

/** Locale-aware display formatters bound to the active UI language and currency. */
export function useFormatters() {
  const language = useActiveLanguage();
  const currency = useSettingsStore((s) => s.currency);

  return {
    money: (amountMinor: MinorAmount, signDisplay?: SignDisplay) =>
      formatMoney(amountMinor, currency, language.locale, { signDisplay }),
    monthYear: (date: Date) => formatMonthYear(date, language.code, language.locale),
    shortDate: (isoDate: IsoDate) => formatShortDate(isoDate, language.code),
  };
}
