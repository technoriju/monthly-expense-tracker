import { normalizeDigits } from '@/utils/digits';
import { MAX_AMOUNT_MINOR } from '@/utils/money';

import { UNITS } from './lineLabels';

/** A number found on a receipt line. Values are integers — no float money math. */
export interface NumberToken {
  /** Text as it appeared (after digit normalization and OCR fixes). */
  raw: string;
  /** Offset of the whole token (currency mark included) in the line. */
  start: number;
  /** Offset of the numeric part in the line. */
  index: number;
  /** End offset (exclusive) of the whole token, including currency marks. */
  end: number;
  /** Value in paise, or null when it cannot be a money amount (bad grouping, > 2 decimals, id). */
  minor: number | null;
  /** Value in thousandths (quantities like 0.250 kg), or null when it has > 3 decimals. */
  milli: number | null;
  /** Written with a leading minus or in parentheses. */
  negative: boolean;
  hasDecimals: boolean;
  /** Preceded by ₹ / Rs / INR or followed by `/-`. */
  hasCurrency: boolean;
  /** Plain digits only: no decimals, grouping or currency mark (could be a count or an id). */
  plain: boolean;
  /** An OCR look-alike letter (O, l, I, S) was read as a digit, or a decimal comma was assumed. */
  corrected: boolean;
}

const OCR_LOOKALIKES: Record<string, string> = { O: '0', o: '0', I: '1', l: '1', S: '5' };

/**
 * Replaces look-alike letters inside digit runs ("1O0.5O" → "100.50"), keeping the string
 * length so offsets stay valid. Only runs that already contain at least two real digits are
 * touched, so words are never rewritten.
 */
function fixLookalikes(line: string): { text: string; fixed: boolean[] } {
  const fixed = new Array<boolean>(line.length).fill(false);
  const text = line.replace(
    /([^A-Za-z]|^)([0-9OoIlS][0-9OoIlS.,]*[0-9OoIlS])(?=[^A-Za-z]|$)/g,
    (match, before: string, run: string, offset: number) => {
      const digits = run.replace(/[^0-9]/g, '').length;
      if (digits < 2 || !/[OoIlS]/.test(run)) return match;
      const start = offset + before.length;
      let out = '';
      for (let i = 0; i < run.length; i++) {
        const ch = run[i] ?? '';
        const sub = OCR_LOOKALIKES[ch];
        if (sub !== undefined) fixed[start + i] = true;
        out += sub ?? ch;
      }
      return before + out;
    },
  );
  return { text, fixed };
}

/** Blanks out text that looks numeric but is never an amount: dates, times, GSTIN, long ids. */
function maskNonAmounts(line: string): string {
  const blank = (m: string) => ' '.repeat(m.length);
  return line
    .replace(/\b\d{1,4}[./-]\d{1,2}[./-]\d{2,4}\b/g, blank) // dates
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, blank) // times
    .replace(/\b(?=[A-Z0-9]*[A-Z])(?=[A-Z0-9]*\d)[A-Z0-9]{8,}\b/gi, blank); // GSTIN, codes
}

const INDIAN_GROUPING = /^\d{1,2}(?:,\d{2})*,\d{3}$/;
const WESTERN_GROUPING = /^\d{1,3}(?:,\d{3})+$/;
/** Words that may follow a number directly ("2kg", "50rs", "2x45", "৫০টাকা"). */
const GLUE_WORDS = new Set([
  ...UNITS,
  'x',
  'rs',
  'inr',
  'taka',
  'rupees',
  'rupee',
  'টাকা',
  'রুপি',
  'रुपये',
  'रु',
]);
const GLUED_WORD = /^[A-Za-zऀ-ॿঀ-৿]+/;

/** Longest plain integer still treated as money (phone numbers and ids are longer). */
const MAX_PLAIN_DIGITS = 6;

function scaled(whole: string, fraction: string, digits: number): number | null {
  if (fraction.length > digits) return null;
  return Number(whole) * 10 ** digits + Number(fraction.padEnd(digits, '0') || '0');
}

/**
 * Finds the numbers on one receipt line. Indic digits are normalized first; dates, times and
 * GSTIN-like codes are ignored; percentages are skipped (tax rates, not amounts).
 */
export function findNumberTokens(input: string): NumberToken[] {
  const normalized = normalizeDigits(input.normalize('NFC'));
  const { text: fixedText, fixed } = fixLookalikes(normalized);
  const text = maskNonAmounts(fixedText);
  // The number must not continue a Latin word ("T0tal"); "x45" is allowed (2x45).
  const pattern =
    /(^|[^A-WYZa-wyz0-9])(₹|\brs\.?|\binr\b)?\s*(\(\s*)?(-)?(\d[\d,]*(?:\.\d+)?)(\s*\))?(\s*\/-)?(\s*%)?/gi;
  const tokens: NumberToken[] = [];
  for (const m of text.matchAll(pattern)) {
    const [whole, prefix = '', currency, openParen, minus, number = '', closeParen, slashDash] = m;
    if (m[8]) continue; // percentage
    const start = (m.index ?? 0) + prefix.length;
    const index = start + whole.slice(prefix.length).indexOf(number);
    const end = (m.index ?? 0) + whole.length;
    // "6B": a digit run glued to letters that are not a unit — OCR noise, not an amount.
    const glued = GLUED_WORD.exec(text.slice(end))?.[0].toLowerCase();
    const unreadable = glued !== undefined && !GLUE_WORDS.has(glued);
    const numberText = number.replace(/[.,]+$/, ''); // trailing punctuation: "120.00."
    let [intPart = '', decPart = ''] = numberText.split('.');
    let corrected = fixed.slice(index, index + numberText.length).some(Boolean);
    let validGrouping = true;
    if (intPart.includes(',')) {
      if (INDIAN_GROUPING.test(intPart) || WESTERN_GROUPING.test(intPart)) {
        intPart = intPart.replace(/,/g, '');
      } else if (/^\d+,\d{2}$/.test(intPart) && decPart === '') {
        // "120,50": a decimal comma, not grouping. Flagged so the user checks it.
        [intPart, decPart] = intPart.split(',') as [string, string];
        corrected = true;
      } else {
        validGrouping = false;
      }
    }
    const hasDecimals = numberText.includes('.') || (corrected && decPart.length > 0);
    const hasCurrency = Boolean(currency) || Boolean(slashDash);
    const plain = !hasDecimals && !hasCurrency && !number.includes(',');
    const tooLongForMoney = plain && intPart.length > MAX_PLAIN_DIGITS;
    let minor =
      validGrouping && !tooLongForMoney && !unreadable && /^\d+$/.test(intPart)
        ? scaled(intPart, decPart, 2)
        : null;
    if (minor !== null && minor > MAX_AMOUNT_MINOR) minor = null;
    const milli =
      validGrouping && !unreadable && /^\d+$/.test(intPart) ? scaled(intPart, decPart, 3) : null;
    tokens.push({
      raw: numberText,
      start,
      index,
      end,
      minor,
      milli,
      negative: Boolean(minus) || (Boolean(openParen) && Boolean(closeParen)),
      hasDecimals,
      hasCurrency,
      plain,
      corrected,
    });
  }
  return tokens;
}
