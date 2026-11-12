import { z } from 'zod';

import { PAYMENT_METHODS, type CurrencyCode, type PaymentMethod } from '@/types/money';
import { isIsoDate } from '@/utils/dates';
import { MAX_AMOUNT_MINOR, parseAmountToMinor } from '@/utils/money';

import type { TransactionInput } from './types';

export const NOTE_MAX_LENGTH = 200;

/** Validation message ids; the UI translates them as `transactions:validation.<id>`. */
export type ValidationMessage =
  | 'amountRequired'
  | 'amountInvalid'
  | 'categoryRequired'
  | 'categoryMismatch'
  | 'dateInvalid'
  | 'noteTooLong';

const msg = (id: ValidationMessage) => ({ message: id });

const transactionType = z.enum(['income', 'expense']);
const isoDate = z.string().refine(isIsoDate, msg('dateInvalid'));

/** Raw form values (what the inputs hold). */
export interface TransactionFormValues {
  type: 'income' | 'expense';
  /** Typed text; may contain Indic digits and grouping commas. */
  amount: string;
  categoryId: number | null;
  occurredOn: string;
  note: string;
  paymentMethod: PaymentMethod | null;
}

/** Form schema. Amount is validated as text and converted to paise in `toTransactionInput`. */
export function createTransactionFormSchema(currency: CurrencyCode) {
  return z.object({
    type: transactionType,
    amount: z
      .string()
      .trim()
      .min(1, msg('amountRequired'))
      // Empty input is reported once, as `amountRequired`, by `min` above.
      .refine((v) => v === '' || parseAmountToMinor(v, currency) !== null, msg('amountInvalid')),
    categoryId: z
      .number()
      .int()
      .positive()
      .nullable()
      .refine((v) => v !== null, msg('categoryRequired')),
    occurredOn: isoDate,
    note: z.string().max(NOTE_MAX_LENGTH, msg('noteTooLong')),
    paymentMethod: z.enum(PAYMENT_METHODS).nullable(),
  }) satisfies z.ZodType<TransactionFormValues>;
}

/** Service-level schema: the canonical, already-converted transaction input. */
export const transactionInputSchema = z.object({
  type: transactionType,
  amountMinor: z.number().int().positive().max(MAX_AMOUNT_MINOR),
  categoryId: z.number().int().positive(),
  occurredOn: isoDate,
  note: z.string().max(NOTE_MAX_LENGTH).nullable(),
  paymentMethod: z.enum(PAYMENT_METHODS).nullable(),
}) satisfies z.ZodType<TransactionInput>;

/**
 * Converts validated form values to a service input: rupees text → integer paise,
 * empty note → null. Throws if called with values the form schema would reject.
 */
export function toTransactionInput(
  values: TransactionFormValues,
  currency: CurrencyCode,
): TransactionInput {
  const amountMinor = parseAmountToMinor(values.amount, currency);
  if (amountMinor === null || values.categoryId === null) {
    throw new Error('toTransactionInput called with unvalidated values');
  }
  const note = values.note.trim();
  return {
    type: values.type,
    amountMinor,
    categoryId: values.categoryId,
    occurredOn: values.occurredOn,
    note: note.length > 0 ? note : null,
    paymentMethod: values.paymentMethod,
  };
}
