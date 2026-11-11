import type { CurrencyCode, MinorAmount } from '@/types/money';

import { normalizeDigits } from './digits';

interface CurrencyInfo {
  symbol: string;
  /** Number of minor-unit digits (INR: 2 → 100 paise per rupee). */
  minorDigits: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  INR: { symbol: '₹', minorDigits: 2 },
};

export const DEFAULT_CURRENCY: CurrencyCode = 'INR';

export function getCurrencyInfo(currency: CurrencyCode): CurrencyInfo {
  return CURRENCIES[currency];
}

/** True when the amount has no fractional minor units (e.g. ₹500.00). */
export function isWholeAmount(amountMinor: MinorAmount, currency: CurrencyCode): boolean {
  return amountMinor % 10 ** getCurrencyInfo(currency).minorDigits === 0;
}

/**
 * Converts minor units to a major-unit number. DISPLAY ONLY — never use the result
 * for arithmetic or storage.
 */
export function minorToMajorForDisplay(amountMinor: MinorAmount, currency: CurrencyCode): number {
  return amountMinor / 10 ** getCurrencyInfo(currency).minorDigits;
}

/** Largest accepted amount in major units (₹99,99,99,999). Keeps sums far below 2^53. */
const MAX_MAJOR_DIGITS = 10;

/**
 * Parses a user-typed amount ("1,250.5", "১২৫০", "₹ 500") into integer minor units.
 * Uses string arithmetic only — no float multiplication. Returns null when the input is
 * not a valid positive amount with at most `minorDigits` decimals.
 */
export function parseAmountToMinor(input: string, currency: CurrencyCode): MinorAmount | null {
  const { symbol, minorDigits } = getCurrencyInfo(currency);
  const cleaned = normalizeDigits(input).split(symbol).join('').replace(/[,\s]/g, '');
  const match = /^(\d+)(?:\.(\d*))?$/.exec(cleaned);
  if (!match) return null;
  const whole = (match[1] ?? '').replace(/^0+(?=\d)/, '');
  const decimals = match[2] ?? '';
  if (whole.length > MAX_MAJOR_DIGITS || decimals.length > minorDigits) return null;
  const fraction = decimals.padEnd(minorDigits, '0');
  const minor = Number(whole) * 10 ** minorDigits + Number(fraction || '0');
  return minor > 0 ? minor : null;
}

/** Minor units → plain editable string ("1250.5" → "1250.50", whole → "1250"). For form prefill. */
export function minorToInputString(amountMinor: MinorAmount, currency: CurrencyCode): string {
  const { minorDigits } = getCurrencyInfo(currency);
  const divisor = 10 ** minorDigits;
  const whole = Math.floor(amountMinor / divisor);
  const fraction = amountMinor % divisor;
  return fraction === 0 ? `${whole}` : `${whole}.${`${fraction}`.padStart(minorDigits, '0')}`;
}
