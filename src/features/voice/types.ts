import type { CategoryKey } from '@/features/categories/types';
import type { VoiceLanguage } from '@/i18n/languages';
import type { MinorAmount, PaymentMethod } from '@/types/money';
import type { IsoDate } from '@/utils/dates';

/** Fields the parser could not extract; the user must fill them on the Review screen. */
export type DraftMissingField = 'amount' | 'category';

/** Fields the parser filled but is not sure about; the Review screen highlights them. */
export type DraftUncertainField = 'amount' | 'category' | 'date';

/**
 * An in-memory expense parsed from speech. Never persisted as-is: it only pre-fills the
 * Review screen, and only the user's explicit "Confirm & Save" creates a transaction.
 */
export interface VoiceExpenseDraft {
  /** Integer minor units (paise), or null when no amount could be extracted confidently. */
  amountMinor: MinorAmount | null;
  /** System category key (resolved to an id on the Review screen), or null when unsure. */
  categoryKey: CategoryKey | null;
  occurredOn: IsoDate;
  note: string;
  paymentMethod: PaymentMethod | null;
  /** Speech exactly as recognized (before normalization). */
  recognizedText: string;
  language: VoiceLanguage;
  missingFields: DraftMissingField[];
  uncertainFields: DraftUncertainField[];
  status: 'complete' | 'incomplete';
}
