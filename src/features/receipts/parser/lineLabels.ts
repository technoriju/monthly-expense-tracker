import { findPhrase, normalizeText, tokenize } from '@/features/voice/parser/normalizeText';

/**
 * What a receipt line is, from its words. `info` lines (phone, GSTIN, cashier, change given)
 * hold numbers that are never items or totals.
 */
export type LineLabel =
  | 'info'
  | 'subtotal'
  | 'roundOff'
  | 'discount'
  | 'tax'
  | 'charges'
  | 'grandTotalStrong'
  | 'grandTotalWeak'
  | 'payment';

/**
 * Checked in order; the first match wins, so specific phrases come before generic ones
 * ("total qty" before "total", "gstin" before "gst", "sub total" before "total").
 * English, Hindi, Bengali and romanized words. Phrases are normalized like the line.
 */
const RULES: readonly [LineLabel, readonly string[]][] = [
  [
    'info',
    [
      'total qty',
      'total quantity',
      'total items',
      'total item',
      'no of items',
      'item count',
      'items',
      'qty',
      'gstin',
      'gst no',
      'gst in',
      'fssai',
      'cin',
      'pan',
      'phone',
      'ph',
      'mob',
      'mobile',
      'tel',
      'contact',
      'whatsapp',
      'pin',
      'pincode',
      'table',
      'cashier',
      'counter',
      'token',
      'time',
      'change',
      'tendered',
      'received',
      'you saved',
      'savings',
      'মোবাইল',
      'ফোন',
      'मोबाइल',
      'फोन',
    ],
  ],
  [
    'subtotal',
    [
      'subtotal',
      'sub total',
      'sub amount',
      'gross amount',
      'gross total',
      'taxable amount',
      'taxable value',
      'সাবটোটাল',
      'उप योग',
      'उपयोग',
    ],
  ],
  ['roundOff', ['round off', 'roundoff', 'rounding', 'round', 'r off', 'রাউন্ড অফ', 'राउंड ऑफ']],
  ['discount', ['discount', 'disc', 'less', 'offer', 'coupon', 'ছাড়', 'ডিসকাউন্ট', 'छूट', 'डिस्काउंट']],
  [
    'charges',
    [
      'delivery',
      'packing',
      'packaging',
      'service charge',
      'handling',
      'carry bag',
      'convenience fee',
      'ডেলিভারি',
      'প্যাকিং',
      'डिलीवरी',
      'पैकिंग',
    ],
  ],
  [
    'grandTotalStrong',
    [
      'grand total',
      'net total',
      'net amount',
      'net payable',
      'amount payable',
      'total payable',
      'payable',
      'bill amount',
      'total amount',
      'amount due',
      'balance due',
      'to pay',
      'total incl',
      'inclusive',
      'সর্বমোট',
      'মোট টাকা',
      'মোট দেয়',
      'कुल राशि',
      'कुल योग',
      'कुल देय',
      'देय राशि',
      'शुद्ध राशि',
    ],
  ],
  [
    'tax',
    [
      'gst',
      'cgst',
      'sgst',
      'igst',
      'utgst',
      'vat',
      'tax',
      'cess',
      'জিএসটি',
      'কর',
      'जीएसटी',
      'कर',
      'टैक्स',
    ],
  ],
  ['grandTotalWeak', ['total', 'tot', 'মোট', 'টোটাল', 'कुल', 'योग', 'टोटल']],
  ['payment', ['cash', 'upi', 'card', 'paid', 'tender', 'gpay', 'paytm', 'phonepe', 'নগদ', 'नकद']],
];

const COMPILED = RULES.map(
  ([label, phrases]) => [label, phrases.map((p) => normalizeText(p))] as const,
);

/** Undoes OCR digit look-alikes inside words ("T0tal" → "Total", "5ub" → "Sub") for matching. */
function fixWordLookalikes(line: string): string {
  return line
    .split(/(\s+)/)
    .map((w) =>
      /[A-Za-z]{2}/.test(w) ? w.replace(/0/g, 'o').replace(/1/g, 'l').replace(/5/g, 's') : w,
    )
    .join('');
}

export function lineTokens(line: string): string[] {
  return tokenize(normalizeText(fixWordLookalikes(line)));
}

/** Label for a line, or null for a plain line (item, vendor, free text). */
export function labelLine(line: string): LineLabel | null {
  const tokens = lineTokens(line);
  for (const [label, phrases] of COMPILED) {
    if (phrases.some((p) => findPhrase(tokens, p) >= 0)) return label;
  }
  return null;
}

/** Words that open a receipt but never name the shop. */
const NOT_VENDOR = [
  'tax invoice',
  'invoice',
  'cash memo',
  'bill',
  'receipt',
  'estimate',
  'welcome',
];
const NOT_VENDOR_COMPILED = NOT_VENDOR.map((p) => normalizeText(p));

export function isDocumentTitle(line: string): boolean {
  const tokens = lineTokens(line);
  return tokens.length <= 3 && NOT_VENDOR_COMPILED.some((p) => findPhrase(tokens, p) >= 0);
}

/** Units that may follow a quantity ("2 kg", "500 ml", "3 pcs"). */
export const UNITS = new Set([
  'kg',
  'kgs',
  'g',
  'gm',
  'gms',
  'gram',
  'grams',
  'ml',
  'l',
  'lt',
  'ltr',
  'litre',
  'liter',
  'pc',
  'pcs',
  'piece',
  'pieces',
  'nos',
  'no',
  'dz',
  'dozen',
  'pkt',
  'packet',
  'box',
  'কেজি',
  'গ্রাম',
  'লিটার',
  'পিস',
  'টি',
  'किलो',
  'ग्राम',
  'लीटर',
  'पीस',
]);
