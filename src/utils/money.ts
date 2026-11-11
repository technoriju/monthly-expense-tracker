import type { CurrencyCode, MinorAmount } from '@/types/money';

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
