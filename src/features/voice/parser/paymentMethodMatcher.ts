import type { PaymentMethod } from '@/types/money';

import { findPhrase, normalizeText } from './normalizeText';

const KEYWORDS: Record<Exclude<PaymentMethod, 'other'>, string[]> = {
  cash: ['cash', 'nagad', 'নগদ', 'ক্যাশ', 'नकद', 'नगद', 'कैश'],
  upi: [
    'upi',
    'gpay',
    'google pay',
    'phonepe',
    'phone pe',
    'paytm',
    'bhim',
    'ইউপিআই',
    'গুগল পে',
    'ফোন পে',
    'পেটিএম',
    'यूपीआई',
    'गूगल पे',
    'फोन पे',
    'फ़ोन पे',
    'पेटीएम',
  ],
  card: ['card', 'debit card', 'credit card', 'কার্ড', 'कार्ड'],
  bank_transfer: ['bank transfer', 'neft', 'imps', 'rtgs', 'ব্যাংক ট্রান্সফার', 'बैंक ट्रांसफर'],
};

const ENTRIES = Object.entries(KEYWORDS).flatMap(([method, words]) =>
  words.map((w) => ({ method: method as PaymentMethod, phrase: normalizeText(w) })),
);

/** Payment method when exactly one kind is mentioned; otherwise null (optional field). */
export function matchPaymentMethod(tokens: readonly string[]): PaymentMethod | null {
  const methods = new Set(
    ENTRIES.filter((e) => findPhrase(tokens, e.phrase) >= 0).map((e) => e.method),
  );
  return methods.size === 1 ? ([...methods][0] ?? null) : null;
}
