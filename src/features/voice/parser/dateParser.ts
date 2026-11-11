import { subDays } from 'date-fns';

import { toIsoDate, type IsoDate } from '@/utils/dates';

import { findPhrase, normalizeText } from './normalizeText';

interface DateRule {
  phrases: string[];
  daysAgo: number;
  /** The word has another common meaning (কাল / कल also mean "tomorrow"). */
  uncertain: boolean;
}

/** Longest phrases first so "day before yesterday" wins over "yesterday". */
const RULES: DateRule[] = [
  { phrases: ['day before yesterday', 'গত পরশু'], daysAgo: 2, uncertain: false },
  { phrases: ['parshu', 'porshu', 'parson', 'পরশু', 'परसों', 'परसो'], daysAgo: 2, uncertain: true },
  {
    phrases: ['yesterday', 'last night', 'গতকাল', 'গত রাতে', 'बीते कल', 'कल रात'],
    daysAgo: 1,
    uncertain: false,
  },
  { phrases: ['kal', 'কাল', 'কালকে', 'कल'], daysAgo: 1, uncertain: true },
  {
    phrases: ['today', 'tonight', 'this morning', 'aaj', 'আজ', 'আজকে', 'आज'],
    daysAgo: 0,
    uncertain: false,
  },
].map((rule) => ({ ...rule, phrases: rule.phrases.map(normalizeText) }));

export interface DateResult {
  occurredOn: IsoDate;
  uncertain: boolean;
}

/** Relative day words → local calendar date. Defaults to `today` when none is spoken. */
export function parseDate(tokens: readonly string[], today: Date): DateResult {
  for (const rule of RULES) {
    if (rule.phrases.some((p) => findPhrase(tokens, p) >= 0)) {
      return { occurredOn: toIsoDate(subDays(today, rule.daysAgo)), uncertain: rule.uncertain };
    }
  }
  return { occurredOn: toIsoDate(today), uncertain: false };
}
