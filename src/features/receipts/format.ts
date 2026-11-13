import type { CurrencyCode, MinorAmount } from '@/types/money';
import { normalizeDigits } from '@/utils/digits';
import { minorToInputString, parseAmountToMinor } from '@/utils/money';

import { MAX_QUANTITY_MILLI } from './schemas';

/** "1.5", "২" → thousandths (1500, 2000). Null when empty, zero, malformed or > 3 decimals. */
export function parseQuantityMilli(text: string): number | null {
  const cleaned = normalizeDigits(text).trim();
  const match = /^(\d{1,5})(?:\.(\d{1,3}))?$/.exec(cleaned);
  if (!match) return null;
  const milli = Number(match[1]) * 1000 + Number((match[2] ?? '').padEnd(3, '0'));
  return milli > 0 && milli <= MAX_QUANTITY_MILLI ? milli : null;
}

/** 1500 → "1.5", 2000 → "2". */
export function quantityToInput(milli: number): string {
  const whole = Math.floor(milli / 1000);
  const fraction = milli % 1000;
  return fraction === 0
    ? `${whole}`
    : `${whole}.${`${fraction}`.padStart(3, '0').replace(/0+$/, '')}`;
}

/** Optional amount field: '' → null; invalid → undefined (so the caller can show an error). */
export function parseOptionalAmount(
  text: string,
  currency: CurrencyCode,
  { allowNegative = false } = {},
): MinorAmount | null | undefined {
  const trimmed = normalizeDigits(text).trim();
  if (trimmed === '') return null;
  const negative = allowNegative && trimmed.startsWith('-');
  const body = negative ? trimmed.slice(1) : trimmed;
  if (/^0+(\.0*)?$/.test(body)) return 0;
  const minor = parseAmountToMinor(body, currency);
  if (minor === null) return undefined;
  return negative ? -minor : minor;
}

export function amountToInput(minor: MinorAmount | null, currency: CurrencyCode): string {
  if (minor === null) return '';
  return minor < 0
    ? `-${minorToInputString(-minor, currency)}`
    : minorToInputString(minor, currency);
}
