import type { CurrencyCode, MinorAmount } from '@/types/money';

import { getCurrencyInfo, isWholeAmount, minorToMajorForDisplay } from './money';

export type SignDisplay = 'auto' | 'always' | 'never' | 'exceptZero';

interface FormatMoneyOptions {
  signDisplay?: SignDisplay;
}

/**
 * Formats integer minor units for display, using the locale's grouping
 * (Indian lakh/crore for `*-IN`). Whole amounts omit decimals ("₹75,000").
 * Digits stay Latin; native-digit display is a future setting.
 */
export function formatMoney(
  amountMinor: MinorAmount,
  currency: CurrencyCode,
  locale: string,
  { signDisplay = 'auto' }: FormatMoneyOptions = {},
): string {
  const { minorDigits } = getCurrencyInfo(currency);
  const fractionDigits = isWholeAmount(amountMinor, currency) ? 0 : minorDigits;
  const major = minorToMajorForDisplay(amountMinor, currency);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
      numberingSystem: 'latn',
      signDisplay,
    }).format(major);
  } catch {
    return formatMoneyFallback(amountMinor, currency, fractionDigits, signDisplay);
  }
}

/** Used when the runtime's Intl lacks data for `locale`. Indian grouping, symbol prefix. */
export function formatMoneyFallback(
  amountMinor: MinorAmount,
  currency: CurrencyCode,
  fractionDigits: number,
  signDisplay: SignDisplay,
): string {
  const { symbol, minorDigits } = getCurrencyInfo(currency);
  const abs = Math.abs(amountMinor);
  const divisor = 10 ** minorDigits;
  const whole = Math.floor(abs / divisor).toString();
  const fraction = (abs % divisor).toString().padStart(minorDigits, '0');
  const grouped = groupIndian(whole);
  const body = fractionDigits > 0 ? `${grouped}.${fraction}` : grouped;
  const sign =
    amountMinor < 0 && signDisplay !== 'never'
      ? '-'
      : amountMinor > 0 && (signDisplay === 'always' || signDisplay === 'exceptZero')
        ? '+'
        : amountMinor === 0 && signDisplay === 'always'
          ? '+'
          : '';
  return `${sign}${symbol}${body}`;
}

/** 1234567 → "12,34,567" */
function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
}

/**
 * Formats basis points (10000 = 100%) as a localized percentage with Latin digits,
 * e.g. 3850 → "38.5%". Falls back to plain "38.5%" when Intl lacks the locale.
 */
export function formatPercentBp(
  basisPoints: number,
  locale: string,
  {
    maximumFractionDigits = 1,
    signDisplay = 'auto',
  }: { maximumFractionDigits?: number; signDisplay?: SignDisplay } = {},
): string {
  const fraction = basisPoints / 10_000;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      maximumFractionDigits,
      numberingSystem: 'latn',
      signDisplay,
    }).format(fraction);
  } catch {
    const factor = 10 ** maximumFractionDigits;
    const value = Math.round(Math.abs(basisPoints / 100) * factor) / factor;
    const sign =
      basisPoints < 0 && signDisplay !== 'never'
        ? '-'
        : basisPoints > 0 && (signDisplay === 'always' || signDisplay === 'exceptZero')
          ? '+'
          : '';
    return `${sign}${value}%`;
  }
}
