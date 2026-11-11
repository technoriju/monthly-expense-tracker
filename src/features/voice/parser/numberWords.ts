import { normalizeText } from './normalizeText';

/**
 * Number words → amounts for English, Bengali and Hindi (Indian numbering: hundred,
 * thousand, lakh, crore). All values are integer HUNDREDTHS of a major unit (paise for INR)
 * so fractions like দেড় (1½) or साढ़े (+½) never need floating point.
 */
export const HUNDREDTHS = 100;

type Lexeme =
  | { kind: 'num'; value: number; word: boolean; tens: boolean }
  | { kind: 'hundred' }
  | { kind: 'scale'; scale: number }
  | { kind: 'mod'; delta: number }
  | { kind: 'and' };

const ENGLISH_UNITS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];
const ENGLISH_TENS = ['twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** Bengali 1–99 (index = value). Alternate spellings are separated by `|`. */
const BENGALI_1_99 = [
  '',
  'এক',
  'দুই|দু',
  'তিন',
  'চার',
  'পাঁচ',
  'ছয়|ছয়|ছ',
  'সাত',
  'আট',
  'নয়|নয়|ন',
  'দশ',
  'এগারো|এগার',
  'বারো',
  'তেরো|তের',
  'চোদ্দ|চৌদ্দ',
  'পনেরো|পনের',
  'ষোলো|ষোল',
  'সতেরো|সতের',
  'আঠারো|আঠার',
  'উনিশ',
  'কুড়ি|বিশ',
  'একুশ',
  'বাইশ',
  'তেইশ',
  'চব্বিশ',
  'পঁচিশ',
  'ছাব্বিশ',
  'সাতাশ',
  'আঠাশ',
  'উনত্রিশ',
  'তিরিশ|ত্রিশ',
  'একত্রিশ',
  'বত্রিশ',
  'তেত্রিশ',
  'চৌত্রিশ',
  'পঁয়ত্রিশ',
  'ছত্রিশ',
  'সাঁইত্রিশ',
  'আটত্রিশ',
  'উনচল্লিশ',
  'চল্লিশ',
  'একচল্লিশ',
  'বিয়াল্লিশ',
  'তেতাল্লিশ',
  'চুয়াল্লিশ',
  'পঁয়তাল্লিশ',
  'ছেচল্লিশ',
  'সাতচল্লিশ',
  'আটচল্লিশ',
  'উনপঞ্চাশ',
  'পঞ্চাশ',
  'একান্ন',
  'বাহান্ন',
  'তিপ্পান্ন',
  'চুয়ান্ন',
  'পঞ্চান্ন',
  'ছাপ্পান্ন',
  'সাতান্ন',
  'আটান্ন',
  'উনষাট',
  'ষাট',
  'একষট্টি',
  'বাষট্টি',
  'তেষট্টি',
  'চৌষট্টি',
  'পঁয়ষট্টি',
  'ছেষট্টি',
  'সাতষট্টি',
  'আটষট্টি',
  'উনসত্তর',
  'সত্তর',
  'একাত্তর',
  'বাহাত্তর',
  'তিয়াত্তর',
  'চুয়াত্তর',
  'পঁচাত্তর',
  'ছিয়াত্তর',
  'সাতাত্তর',
  'আটাত্তর',
  'উনআশি|উনাশি',
  'আশি',
  'একাশি',
  'বিরাশি',
  'তিরাশি',
  'চুরাশি',
  'পঁচাশি',
  'ছিয়াশি',
  'সাতাশি',
  'অষ্টআশি|অষ্টাশি|আটাশি',
  'উননব্বই',
  'নব্বই',
  'একানব্বই',
  'বিরানব্বই',
  'তিরানব্বই',
  'চুরানব্বই',
  'পঁচানব্বই',
  'ছিয়ানব্বই',
  'সাতানব্বই',
  'আটানব্বই',
  'নিরানব্বই',
];

/** Hindi 1–99 (index = value). Alternate spellings are separated by `|`. */
const HINDI_1_99 = [
  '',
  'एक',
  'दो',
  'तीन',
  'चार',
  'पांच|पाँच',
  'छह|छः|छे|छै',
  'सात',
  'आठ',
  'नौ',
  'दस',
  'ग्यारह',
  'बारह',
  'तेरह',
  'चौदह',
  'पंद्रह|पन्द्रह',
  'सोलह',
  'सत्रह',
  'अठारह',
  'उन्नीस',
  'बीस',
  'इक्कीस',
  'बाईस',
  'तेईस',
  'चौबीस',
  'पच्चीस',
  'छब्बीस',
  'सत्ताईस',
  'अट्ठाईस',
  'उनतीस',
  'तीस',
  'इकतीस',
  'बत्तीस',
  'तैंतीस',
  'चौंतीस',
  'पैंतीस',
  'छत्तीस',
  'सैंतीस',
  'अड़तीस',
  'उनतालीस',
  'चालीस',
  'इकतालीस',
  'बयालीस',
  'तैंतालीस',
  'चौवालीस',
  'पैंतालीस',
  'छियालीस',
  'सैंतालीस',
  'अड़तालीस',
  'उनचास',
  'पचास',
  'इक्यावन',
  'बावन',
  'तिरपन',
  'चौवन',
  'पचपन',
  'छप्पन',
  'सत्तावन',
  'अट्ठावन',
  'उनसठ',
  'साठ',
  'इकसठ',
  'बासठ',
  'तिरसठ',
  'चौंसठ',
  'पैंसठ',
  'छियासठ',
  'सड़सठ',
  'अड़सठ',
  'उनहत्तर',
  'सत्तर',
  'इकहत्तर',
  'बहत्तर',
  'तिहत्तर',
  'चौहत्तर',
  'पचहत्तर',
  'छिहत्तर',
  'सतहत्तर',
  'अठहत्तर',
  'उन्यासी|उनासी',
  'अस्सी',
  'इक्यासी',
  'बयासी',
  'तिरासी',
  'चौरासी',
  'पचासी',
  'छियासी',
  'सत्तासी',
  'अट्ठासी',
  'नवासी',
  'नब्बे',
  'इक्यानवे',
  'बानवे',
  'तिरानवे',
  'चौरानवे',
  'पचानवे',
  'छियानवे',
  'सत्तानवे',
  'अट्ठानवे',
  'निन्यानवे',
];

const LEXICON = new Map<string, Lexeme>();
/** Words that can precede a fused Bengali hundred suffix (দুশো, বারোশো, দেড়শো). Value in hundredths. */
const BENGALI_HUNDRED_PREFIX = new Map<string, number>();
const BENGALI_HUNDRED_SUFFIXES = ['শো', 'শত', 'শ'].map(normalizeText);

function add(words: string, lexeme: Lexeme) {
  for (const word of words.split('|')) LEXICON.set(normalizeText(word), lexeme);
}

const num = (units: number, word = true, tens = false): Lexeme => ({
  kind: 'num',
  value: units * HUNDREDTHS,
  word,
  tens,
});

ENGLISH_UNITS.forEach((w, i) => i > 0 && add(w, num(i)));
ENGLISH_TENS.forEach((w, i) => add(w, num((i + 2) * 10, true, true)));
BENGALI_1_99.forEach((w, i) => {
  if (i === 0) return;
  add(w, num(i));
  for (const v of w.split('|')) BENGALI_HUNDRED_PREFIX.set(normalizeText(v), i * HUNDREDTHS);
});
HINDI_1_99.forEach((w, i) => i > 0 && add(w, num(i)));

const ONE_AND_HALF = 1.5 * HUNDREDTHS;
const TWO_AND_HALF = 2.5 * HUNDREDTHS;
add('দেড়|डेढ़|डेढ', { kind: 'num', value: ONE_AND_HALF, word: true, tens: false });
add('আড়াই|ঢাই|ढाई', { kind: 'num', value: TWO_AND_HALF, word: true, tens: false });
for (const [w, v] of [
  ['দেড়', ONE_AND_HALF],
  ['আড়াই', TWO_AND_HALF],
] as const) {
  BENGALI_HUNDRED_PREFIX.set(normalizeText(w), v);
}
add('সাড়ে|साढ़े|साढे', { kind: 'mod', delta: HUNDREDTHS / 2 });
add('সোয়া|सवा', { kind: 'mod', delta: HUNDREDTHS / 4 });
add('পৌনে|पौने', { kind: 'mod', delta: -HUNDREDTHS / 4 });

add('hundred|hundreds|শো|শত|सौ', { kind: 'hundred' });
add('thousand|thousands|হাজার|हज़ार|हजार', { kind: 'scale', scale: 1_000 });
add('lakh|lakhs|lac|lacs|লাখ|লক্ষ|लाख', { kind: 'scale', scale: 100_000 });
add('crore|crores|কোটি|करोड़|करोड', { kind: 'scale', scale: 10_000_000 });
add('and|আর|और', { kind: 'and' });

/** Accepts "250", "250.5", "250.50"; at most 2 decimals and 10 integer digits. */
function digitValue(token: string): number | null {
  const match = /^(\d{1,10})(?:\.(\d{1,2}))?$/.exec(token);
  if (!match) return null;
  return Number(match[1]) * HUNDREDTHS + Number((match[2] ?? '').padEnd(2, '0'));
}

function lex(token: string): Lexeme[] | null {
  const digits = digitValue(token);
  if (digits !== null) return [{ kind: 'num', value: digits, word: false, tens: false }];
  const known = LEXICON.get(token);
  if (known) return [known];
  // Fused Bengali hundreds: পাঁচশো = পাঁচ + শো, দেড়শো = দেড় + শো.
  for (const suffix of BENGALI_HUNDRED_SUFFIXES) {
    if (!token.endsWith(suffix)) continue;
    const prefix = BENGALI_HUNDRED_PREFIX.get(token.slice(0, -suffix.length));
    if (prefix !== undefined) {
      return [{ kind: 'num', value: prefix, word: true, tens: false }, { kind: 'hundred' }];
    }
  }
  return null;
}

export interface NumberGroup {
  /** Hundredths of a major unit. Always > 0. */
  value: number;
  /** Token span [start, end). */
  start: number;
  end: number;
}

const SCALE_WORDS = new Set(['hundred', 'thousand', 'lakh', 'lac', 'crore']);

/**
 * Finds every spoken/written number in `tokens` (normalized). Adjacent plain numbers are kept
 * apart ("100 200" → two groups) — only multiplier sequences combine
 * ("two thousand five hundred", "১ লাখ ২০ হাজার", "साढ़े तीन सौ", "5 k").
 */
export function findNumberGroups(tokens: readonly string[]): NumberGroup[] {
  const groups: NumberGroup[] = [];
  let total = 0;
  let current = 0;
  let start = -1;
  let last: Lexeme['kind'] | null = null;
  let lastTens = false;
  let pendingMod = 0;

  const flush = (end: number) => {
    const value = total + current;
    if (start >= 0 && value > 0) groups.push({ value, start, end });
    total = 0;
    current = 0;
    start = -1;
    last = null;
    lastTens = false;
    pendingMod = 0;
  };
  const begin = (i: number) => {
    if (start < 0) start = i;
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i] ?? '';
    const next = tokens[i + 1] ?? '';
    const active = start >= 0;

    // "5 k" → 5000; "a hundred" / "an thousand"-style article before a multiplier → 1.
    if (token === 'k' && active && last === 'num') {
      total += current * 1_000;
      current = 0;
      last = 'scale';
      continue;
    }
    if ((token === 'a' || token === 'an') && SCALE_WORDS.has(next.replace(/s$/, ''))) {
      if (active && last === 'num') flush(i);
      begin(i);
      current += HUNDREDTHS;
      last = 'num';
      continue;
    }

    const lexemes = lex(token);
    if (!lexemes) {
      flush(i);
      continue;
    }
    for (const lexeme of lexemes) {
      switch (lexeme.kind) {
        case 'and': {
          // Only joins "one hundred and fifty"; otherwise it ends the number.
          const nextLex = lex(next);
          if (!(active && last === 'hundred' && nextLex?.[0]?.kind === 'num')) flush(i);
          break;
        }
        case 'mod':
          if (active && last !== 'scale' && last !== 'hundred') flush(i);
          begin(i);
          pendingMod = lexeme.delta;
          last = 'mod';
          break;
        case 'num': {
          const joinsTens =
            last === 'num' && lastTens && lexeme.word && lexeme.value < 10 * HUNDREDTHS;
          if (active && last === 'num' && !joinsTens) flush(i);
          begin(i);
          current += lexeme.value + pendingMod;
          pendingMod = 0;
          lastTens = lexeme.tens;
          last = 'num';
          break;
        }
        case 'hundred':
          begin(i);
          // "सवा सौ" = 1¼ × 100: a modifier straight before a multiplier applies to one.
          current = ((current || HUNDREDTHS) + pendingMod) * 100;
          pendingMod = 0;
          last = 'hundred';
          lastTens = false;
          break;
        case 'scale':
          begin(i);
          total += ((current || HUNDREDTHS) + pendingMod) * lexeme.scale;
          pendingMod = 0;
          current = 0;
          last = 'scale';
          lastTens = false;
          break;
      }
    }
  }
  flush(tokens.length);
  return groups;
}
