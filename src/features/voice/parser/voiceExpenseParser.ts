import { NOTE_MAX_LENGTH } from '@/features/transactions/schemas';
import type { VoiceLanguage } from '@/i18n/languages';
import type { CurrencyCode } from '@/types/money';

import type { DraftMissingField, DraftUncertainField, VoiceExpenseDraft } from '../types';
import { parseAmount } from './amountParser';
import { matchCategory } from './categoryMatcher';
import { parseDate } from './dateParser';
import { normalizeText, tokenize } from './normalizeText';
import { matchPaymentMethod } from './paymentMethodMatcher';

export interface ParseOptions {
  language: VoiceLanguage;
  currency: CurrencyCode;
  /** Reference "today" for relative dates. */
  today: Date;
}

/**
 * Recognized speech → in-memory expense draft. Pure: no I/O, no DB, no network.
 * Missing values are reported, never invented. The parser is language-agnostic (it accepts
 * mixed English/Bengali/Hindi in one utterance); `language` is recorded on the draft.
 */
export function parseVoiceExpense(text: string, options: ParseOptions): VoiceExpenseDraft {
  const tokens = tokenize(normalizeText(text));
  const amount = parseAmount(tokens, options.currency);
  const category = matchCategory(tokens);
  const date = parseDate(tokens, options.today);

  const missingFields: DraftMissingField[] = [];
  if (amount.amountMinor === null) missingFields.push('amount');
  if (category.categoryKey === null) missingFields.push('category');

  const uncertainFields: DraftUncertainField[] = [];
  if (amount.uncertain) uncertainFields.push('amount');
  if (category.uncertain) uncertainFields.push('category');
  if (date.uncertain) uncertainFields.push('date');

  const recognizedText = text.trim();
  return {
    amountMinor: amount.amountMinor,
    categoryKey: category.categoryKey,
    occurredOn: date.occurredOn,
    note: recognizedText.slice(0, NOTE_MAX_LENGTH),
    paymentMethod: matchPaymentMethod(tokens),
    recognizedText,
    language: options.language,
    missingFields,
    uncertainFields,
    status: missingFields.length === 0 ? 'complete' : 'incomplete',
  };
}
