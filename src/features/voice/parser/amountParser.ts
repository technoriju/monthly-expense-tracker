import type { CurrencyCode, MinorAmount } from '@/types/money';
import { getCurrencyInfo } from '@/utils/money';

import { matchesWord, normalizeText } from './normalizeText';
import { findNumberGroups, HUNDREDTHS, type NumberGroup } from './numberWords';

/** Words that mark a number as money ("50 rupees", "৫০ টাকা", "₹ 50", "50 रुपये"). */
const CURRENCY_MARKERS = [
  '₹',
  'rs',
  'inr',
  'rupee',
  'rupees',
  'rupay',
  'rupaye',
  'rupiya',
  'bucks',
  'taka',
  'takar',
  'টাকা',
  'রুপি',
  'রুপিয়া',
  'रुपये',
  'रुपए',
  'रुपया',
  'रुपयों',
  'रुपैया',
  'रु',
  'रूपये',
  'रूपए',
].map(normalizeText);

/** Largest accepted amount in major units, matching `parseAmountToMinor` (₹99,99,99,999). */
const MAX_MAJOR = 9_999_999_999;

export interface AmountResult {
  amountMinor: MinorAmount | null;
  /** True when numbers were heard but none could be chosen safely. */
  uncertain: boolean;
}

const isMarker = (token: string | undefined) =>
  token !== undefined && CURRENCY_MARKERS.some((m) => matchesWord(token, m));

function toMinor(hundredths: number, currency: CurrencyCode): MinorAmount {
  const { minorDigits } = getCurrencyInfo(currency);
  return Math.round((hundredths * 10 ** minorDigits) / HUNDREDTHS);
}

function isMarked(group: NumberGroup, tokens: readonly string[]): boolean {
  return isMarker(tokens[group.start - 1]) || isMarker(tokens[group.end]);
}

/**
 * Extracts the spent amount. Never guesses: with several different numbers and no single
 * one next to a currency word, the amount is left empty for the user to enter.
 */
export function parseAmount(tokens: readonly string[], currency: CurrencyCode): AmountResult {
  const groups = findNumberGroups(tokens).filter((g) => g.value <= MAX_MAJOR * HUNDREDTHS);
  if (groups.length === 0) return { amountMinor: null, uncertain: false };

  const marked = groups.filter((g) => isMarked(g, tokens));
  const pool = marked.length > 0 ? marked : groups;
  const values = new Set(pool.map((g) => g.value));
  if (values.size !== 1) return { amountMinor: null, uncertain: true };

  const [value] = values;
  return { amountMinor: toMinor(value ?? 0, currency), uncertain: false };
}
