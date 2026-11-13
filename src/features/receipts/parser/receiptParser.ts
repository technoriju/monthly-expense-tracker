import { matchPaymentMethod } from '@/features/voice/parser/paymentMethodMatcher';
import { normalizeDigits } from '@/utils/digits';
import { isIsoDate, toIsoDate, type IsoDate } from '@/utils/dates';

import type { OcrLine } from '../ocr/types';
import type { ParsedReceipt, ReceiptFlag, ReceiptItemFlag, TotalCandidate } from '../types';
import { isDocumentTitle, labelLine, lineTokens, UNITS, type LineLabel } from './lineLabels';
import { findNumberTokens, type NumberToken } from './numberTokens';

/** Below this line confidence the row's name and amount are flagged for checking. */
export const LOW_CONFIDENCE = 0.6;
/** Vendor is looked for only in the first lines of the receipt. */
const VENDOR_LINES = 5;

const LETTER = /[A-Za-zऀ-ॿঀ-৿]/;
const LETTERS = /[A-Za-zऀ-ॿঀ-৿]/g;

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function makeDate(year: number, month: number, day: number, today: Date): IsoDate | null {
  if (year < 100) year += 2000;
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return isIsoDate(iso) && iso <= toIsoDate(today) ? iso : null;
}

/** First real, non-future date on the line. Indian order (day before month) is assumed. */
export function findDate(line: string, today: Date): IsoDate | null {
  const s = normalizeDigits(line);
  const ymd = /\b(\d{4})[./-](\d{1,2})[./-](\d{1,2})\b/.exec(s);
  if (ymd) return makeDate(Number(ymd[1]), Number(ymd[2]), Number(ymd[3]), today);
  const dmy = /\b(\d{1,2})[./-](\d{1,2})[./-](\d{4}|\d{2})\b/.exec(s);
  if (dmy) return makeDate(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]), today);
  const named = /\b(\d{1,2})(?:st|nd|rd|th)?[\s-]*([a-z]{3})[a-z]*[\s,'-]*(\d{4}|\d{2})\b/i.exec(s);
  if (named) {
    const month = MONTHS.indexOf((named[2] ?? '').toLowerCase()) + 1;
    if (month > 0) return makeDate(Number(named[3]), month, Number(named[1]), today);
  }
  return null;
}

const RECEIPT_NUMBER =
  /\b(?:bill|invoice|inv|receipt|rcpt|order|memo)\s*(?:no\.?|number|num|#)?\s*[:#.-]?\s*([A-Z0-9][A-Z0-9/-]{0,19})/i;

export function findReceiptNumber(line: string): string | null {
  const match = RECEIPT_NUMBER.exec(normalizeDigits(line));
  const value = match?.[1];
  return value !== undefined && /\d/.test(value) ? value : null;
}

/** Item name: the line without its numbers, units and multiplication signs. */
function itemName(line: string, tokens: readonly NumberToken[]): string {
  let text = normalizeDigits(line);
  for (const t of [...tokens].reverse()) {
    text = `${text.slice(0, t.start)} ${text.slice(t.end)}`;
  }
  const words = text
    .split(/\s+/)
    .map((w) => w.replace(/^[\s.,;:|*#@x×=₹~/-]+|[\s.,;:|*#@x×=₹~/-]+$/gi, ''))
    .filter((w) => w.length > 0 && !UNITS.has(w.toLowerCase()) && !/^(rs|inr)$/i.test(w));
  return words.join(' ').trim();
}

/** A name OCR clearly struggled with: few letters, mostly symbols. */
function nameLooksUnreliable(name: string): boolean {
  const letters = name.match(LETTERS)?.length ?? 0;
  return letters < 3 || letters / name.replace(/\s/g, '').length < 0.6;
}

/** Unit written right after a quantity ("2 kg", "2kg"). */
function unitAfter(line: string, token: NumberToken): string | null {
  const next = /^\s*([^\s\d.,:|*x×@=]+)/i.exec(line.slice(token.end));
  const word = next?.[1]?.toLowerCase();
  return word !== undefined && UNITS.has(word) ? word : null;
}

/** "2 x 45.00", "2 @ 45", "2×45". */
function isMultiplied(line: string, left: NumberToken, right: NumberToken): boolean {
  return /^\s*(?:[^\s\d]+\s*)?[x×*@]\s*$/i.test(line.slice(left.end, right.index));
}

/** qty (thousandths) × price, rounded to the nearest paisa. BigInt keeps it exact. */
export function multiplyQuantity(quantityMilli: number, unitPriceMinor: number): number {
  const product = BigInt(quantityMilli) * BigInt(unitPriceMinor);
  return Number((product + 500n) / 1000n);
}

/**
 * total × 1000 ÷ divisor when it divides exactly, else null. Gives the quantity (thousandths)
 * from total ÷ unit price, and the unit price from total ÷ quantity (thousandths).
 */
function divideScaled(totalMinor: number, divisor: number): number | null {
  if (divisor <= 0) return null;
  const scaled = BigInt(totalMinor) * 1000n;
  return scaled % BigInt(divisor) === 0n ? Number(scaled / BigInt(divisor)) : null;
}

interface ItemNumbers {
  quantityMilli: number | null;
  unit: string | null;
  unitPriceMinor: number | null;
  lineTotalMinor: number | null;
  flags: ReceiptItemFlag[];
}

/**
 * Assigns a line's numbers to quantity / unit price / line total. A quantity is only taken
 * from a unit ("2 kg"), a multiplication ("2 x 45") or a small plain count; otherwise the
 * numbers are prices. Conflicts are flagged, never resolved by guessing.
 */
function assignNumbers(line: string, tokens: NumberToken[]): ItemNumbers {
  const flags: ReceiptItemFlag[] = [];
  const result: ItemNumbers = {
    quantityMilli: null,
    unit: null,
    unitPriceMinor: null,
    lineTotalMinor: null,
    flags,
  };
  if (tokens.some((t) => t.corrected || t.minor === null)) flags.push('amountUncertain');

  const last = tokens[tokens.length - 1];
  if (!last) return result;

  if (tokens.length === 1) {
    result.lineTotalMinor = last.minor;
    return result;
  }

  if (tokens.length > 3) flags.push('suspicious');
  const used = tokens.slice(-3);
  const [a, b, c] = used.length === 3 ? used : [undefined, ...used];
  if (!b) return result;

  if (a) {
    // qty, price, total
    result.quantityMilli = a.milli;
    result.unit = unitAfter(line, a);
    result.unitPriceMinor = b.minor;
    result.lineTotalMinor = c?.minor ?? null;
    if (
      result.quantityMilli !== null &&
      result.unitPriceMinor !== null &&
      result.lineTotalMinor !== null &&
      Math.abs(
        multiplyQuantity(result.quantityMilli, result.unitPriceMinor) - result.lineTotalMinor,
      ) > 1
    ) {
      flags.push('quantityMismatch');
    }
    return result;
  }

  // Two numbers.
  const total = c;
  if (!total) return result;
  const unit = unitAfter(line, b);
  if (isMultiplied(line, b, total)) {
    // "2 x 45.00" with no line total: keep both, leave the total for the user.
    result.quantityMilli = b.milli;
    result.unit = unit;
    result.unitPriceMinor = total.minor;
    return result;
  }
  if (unit !== null || (b.plain && b.raw.length <= 3)) {
    result.quantityMilli = b.milli;
    result.unit = unit;
    result.lineTotalMinor = total.minor;
    if (b.milli !== null && total.minor !== null && unit === null) {
      result.unitPriceMinor = divideScaled(total.minor, b.milli);
    }
    return result;
  }
  // Two prices: unit price and line total.
  result.unitPriceMinor = b.minor;
  result.lineTotalMinor = total.minor;
  if (b.minor !== null && total.minor !== null) {
    result.quantityMilli = divideScaled(total.minor, b.minor);
    // Two amounts that do not relate (e.g. 45.00 written over 54.00): maybe overwritten.
    if (result.quantityMilli === null) flags.push('suspicious');
  }
  return result;
}

export interface ParseOptions {
  today: Date;
}

/**
 * Deterministic receipt parser. Pure: no I/O, no randomness. Every value it returns is a
 * suggestion for the review screen; it never invents names or amounts and never "fixes"
 * totals to make them add up.
 */
export function parseReceipt(lines: readonly OcrLine[], { today }: ParseOptions): ParsedReceipt {
  const textLines = lines.map((l) => ({ ...l, text: l.text.trim() })).filter((l) => l.text !== '');
  const parsed: ParsedReceipt = {
    vendorName: null,
    receiptDate: null,
    receiptNumber: null,
    paymentMethod: null,
    items: [],
    subtotalMinor: null,
    taxMinor: null,
    discountMinor: null,
    chargesMinor: null,
    roundOffMinor: null,
    grandTotalMinor: null,
    totalCandidates: [],
    flags: [],
    originalText: lines.map((l) => l.text).join('\n'),
  };
  if (textLines.length === 0) {
    parsed.flags.push('noText');
    parsed.flags.push('totalMissing');
    return parsed;
  }

  const add = (
    field: 'subtotalMinor' | 'taxMinor' | 'discountMinor' | 'chargesMinor',
    v: number,
  ) => {
    parsed[field] = (parsed[field] ?? 0) + v;
  };
  /** A text-only line waiting for its numbers on the next line (wrapped item names). */
  let pendingName: { text: string; confidence: number | null } | null = null;
  let itemCount = 0;

  textLines.forEach((line, lineIndex) => {
    const { text } = line;
    const date = parsed.receiptDate === null ? findDate(text, today) : null;
    if (date !== null) parsed.receiptDate = date;
    const number = parsed.receiptNumber === null ? findReceiptNumber(text) : null;
    if (number !== null) {
      parsed.receiptNumber = number;
      pendingName = null;
      return;
    }

    const tokens = findNumberTokens(text);
    const label: LineLabel | null = isDocumentTitle(text) ? 'info' : labelLine(text);
    const amount = [...tokens].reverse().find((t) => t.minor !== null);

    if (label === 'payment' || (label === 'info' && !isDocumentTitle(text))) {
      parsed.paymentMethod ??= matchPaymentMethod(lineTokens(text));
    }
    if (label !== null) {
      pendingName = null;
      if (!amount || amount.minor === null) return;
      switch (label) {
        case 'subtotal':
        case 'tax':
        case 'charges':
          add(`${label}Minor`, amount.minor);
          return;
        case 'discount':
          add('discountMinor', amount.minor);
          return;
        case 'roundOff':
          parsed.roundOffMinor =
            (parsed.roundOffMinor ?? 0) + (amount.negative ? -1 : 1) * amount.minor;
          return;
        case 'grandTotalStrong':
        case 'grandTotalWeak':
          parsed.totalCandidates.push({
            amountMinor: amount.minor,
            strong: label === 'grandTotalStrong',
            line: text,
          });
          return;
        default:
          return; // info, payment: their numbers are not amounts
      }
    }

    if (tokens.length === 0) {
      // Text only: vendor (near the top) or the first half of a wrapped item name.
      if (
        parsed.vendorName === null &&
        lineIndex < VENDOR_LINES &&
        parsed.items.length === 0 &&
        date === null &&
        (text.match(LETTERS)?.length ?? 0) >= 3
      ) {
        parsed.vendorName = text;
      } else if (LETTER.test(text) && date === null) {
        pendingName = { text, confidence: line.confidence };
      }
      return;
    }
    if (date !== null && tokens.every((t) => t.plain)) return; // a date line with leftovers
    // Address line with a PIN code ("Kolkata 700016"): no prices, a 6-digit number.
    if (
      tokens.some((t) => t.plain && t.raw.length === 6) &&
      !tokens.some((t) => t.hasDecimals || t.hasCurrency)
    ) {
      return;
    }

    // Serial number at the start ("1 Rice 2 kg 120.00").
    let numbers = tokens;
    const first = tokens[0];
    if (
      first &&
      tokens.length > 1 &&
      first.plain &&
      first.raw.length <= 3 &&
      text.slice(0, first.index).trim() === '' &&
      LETTER.test(text.slice(first.end, tokens[1]?.index))
    ) {
      numbers = tokens.slice(1);
    }

    const assigned = assignNumbers(text, numbers);
    let name = itemName(text, tokens);
    let confidence = line.confidence;
    const carried: { text: string; confidence: number | null } | null = pendingName;
    if (carried !== null && !LETTER.test(name)) {
      name = carried.text;
      confidence =
        carried.confidence === null || confidence === null
          ? (carried.confidence ?? confidence)
          : Math.min(carried.confidence, confidence);
    }
    pendingName = null;
    const flags = [...assigned.flags];
    const lowConfidence = confidence !== null && confidence < LOW_CONFIDENCE;
    const hasName = (name.match(LETTERS)?.length ?? 0) >= 2;
    if (!hasName || nameLooksUnreliable(name) || lowConfidence) flags.push('nameUncertain');
    if (lowConfidence && !flags.includes('amountUncertain')) flags.push('amountUncertain');

    itemCount += 1;
    parsed.items.push({
      key: `ocr-${itemCount}`,
      name: hasName ? name : null,
      originalOcrName: name === '' ? null : name,
      quantityMilli: assigned.quantityMilli,
      unit: assigned.unit,
      unitPriceMinor: assigned.unitPriceMinor,
      lineTotalMinor: assigned.lineTotalMinor,
      nameConfidence: confidence,
      amountConfidence: confidence,
      flags,
      userCorrected: false,
    });
  });

  chooseGrandTotal(parsed);
  return parsed;
}

function distinct(candidates: readonly TotalCandidate[]): number[] {
  return [...new Set(candidates.map((c) => c.amountMinor))];
}

/**
 * Picks the grand total only when it is unambiguous: one distinct value among explicit labels
 * ("Grand Total", "Net Payable"), else one among bare "Total" lines. A receipt with nothing but
 * one unnamed amount (handwritten slip) treats that amount as its total.
 */
function chooseGrandTotal(parsed: ParsedReceipt): void {
  const flags: ReceiptFlag[] = parsed.flags;
  const strong = distinct(parsed.totalCandidates.filter((c) => c.strong));
  const weak = distinct(parsed.totalCandidates.filter((c) => !c.strong));
  const pool = strong.length > 0 ? strong : weak;
  if (pool.length === 1) {
    parsed.grandTotalMinor = pool[0] ?? null;
    return;
  }
  if (pool.length > 1) {
    flags.push('totalAmbiguous');
    return;
  }
  const only = parsed.items.length === 1 ? parsed.items[0] : undefined;
  if (only && only.name === null && only.lineTotalMinor !== null && only.quantityMilli === null) {
    parsed.grandTotalMinor = only.lineTotalMinor;
    parsed.totalCandidates.push({ amountMinor: only.lineTotalMinor, strong: false, line: '' });
    parsed.items = [];
    return;
  }
  flags.push('totalMissing');
}
