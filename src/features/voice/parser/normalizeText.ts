import { normalizeDigits } from '@/utils/digits';

/** Devanagari and Bengali nukta. Speech engines are inconsistent about them (हज़ार / हजार). */
const NUKTA = /[़়]/g;

/** Punctuation replaced by a space. `.` and `₹` are handled separately. */
const PUNCTUATION = /[!"#$%&'()*+,\-/:;<=>?@[\\\]^_`{|}~।॥…“”‘’—–]/g;

const isDigit = (ch: string | undefined) => ch !== undefined && ch >= '0' && ch <= '9';

/**
 * Canonical form for parsing: NFC, nukta removed, ASCII digits, lowercase Latin,
 * no punctuation (a `.` survives only between digits), digit runs split from letters
 * ("50rs" → "50 rs", "৫০টাকা" → "50 টাকা"), single spaces.
 *
 * Used for both the recognized text and every dictionary entry, so they always compare equal.
 */
export function normalizeText(input: string): string {
  let s = normalizeDigits(input.normalize('NFC').replace(NUKTA, '')).toLowerCase();
  s = s.replace(/(\d),(?=\d)/g, '$1'); // grouping commas: 1,25,000 → 125000
  s = s.replace(/₹/g, ' ₹ ');
  s = s.replace(PUNCTUATION, ' ');
  s = s.replace(/\./g, (_dot, offset: number) =>
    isDigit(s[offset - 1]) && isDigit(s[offset + 1]) ? '.' : ' ',
  );
  s = s.replace(/(\d)(?=[^\d\s.])/g, '$1 ').replace(/([^\d\s.])(?=\d)/g, '$1 ');
  return s.replace(/\s+/g, ' ').trim();
}

export function tokenize(normalized: string): string[] {
  return normalized.length > 0 ? normalized.split(' ') : [];
}

/** Bengali / Hindi inflections that may follow a dictionary word (বাজারে, বিলের, किताबें). */
const INDIC_SUFFIXES = new Set([
  '',
  'ে',
  'তে',
  'র',
  'ের',
  'কে',
  'য',
  'যে',
  'যের',
  'টা',
  'টি',
  'ও',
  'গুলো',
  'ों',
  'ो',
  'े',
  'ें',
]);

const isLatin = (word: string) => /^[a-z0-9₹]+$/.test(word);

/**
 * True when `token` is `word` or an inflected form of it: English plural (-s/-es),
 * Bengali/Hindi case suffixes. Both arguments must already be normalized.
 */
export function matchesWord(token: string, word: string): boolean {
  if (token === word) return true;
  if (isLatin(word)) return token === `${word}s` || token === `${word}es`;
  return token.startsWith(word) && INDIC_SUFFIXES.has(token.slice(word.length));
}

/** Index of the first occurrence of `phrase` (normalized, space-separated) in `tokens`, or -1. */
export function findPhrase(tokens: readonly string[], phrase: string): number {
  const words = phrase.split(' ');
  for (let i = 0; i + words.length <= tokens.length; i++) {
    if (words.every((w, j) => matchesWord(tokens[i + j] ?? '', w))) return i;
  }
  return -1;
}
