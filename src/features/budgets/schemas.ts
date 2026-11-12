import { z } from 'zod';

import type { CurrencyCode, MinorAmount } from '@/types/money';
import { MAX_AMOUNT_MINOR, parseAmountToMinor } from '@/utils/money';

import type { BudgetMonth, BudgetType } from './types';

/** Validation message ids; the UI translates them as `budgets:validation.<id>`. */
export type BudgetValidationMessage = 'amountRequired' | 'amountInvalid' | 'categoryRequired';

const msg = (id: BudgetValidationMessage) => ({ message: id });

const budgetType = z.enum(['overall', 'category']);

/** 'YYYY-MM' with a real month number. */
export const BUDGET_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Raw editor values (what the inputs hold). */
export interface BudgetFormValues {
  budgetType: BudgetType;
  /** Typed text; may contain Indic digits and grouping commas. */
  amount: string;
  /** Required for category budgets, null for the overall budget. */
  categoryId: number | null;
}

export function createBudgetFormSchema(currency: CurrencyCode) {
  return z
    .object({
      budgetType,
      amount: z
        .string()
        .trim()
        .min(1, msg('amountRequired'))
        // Empty input is reported once, as `amountRequired`, by `min` above.
        .refine((v) => v === '' || parseAmountToMinor(v, currency) !== null, msg('amountInvalid')),
      categoryId: z.number().int().positive().nullable(),
    })
    .refine((v) => v.budgetType === 'overall' || v.categoryId !== null, {
      ...msg('categoryRequired'),
      path: ['categoryId'],
    }) satisfies z.ZodType<BudgetFormValues>;
}

export interface BudgetInput {
  month: BudgetMonth;
  amountMinor: MinorAmount;
}

/** Service-level schema: already-converted values. */
export const budgetInputSchema = z.object({
  month: z.string().regex(BUDGET_MONTH_PATTERN),
  amountMinor: z.number().int().positive().max(MAX_AMOUNT_MINOR),
}) satisfies z.ZodType<BudgetInput>;

/** Rupees text → integer paise. Throws if called with a value the form schema rejects. */
export function toAmountMinor(amount: string, currency: CurrencyCode): MinorAmount {
  const minor = parseAmountToMinor(amount, currency);
  if (minor === null) throw new Error('toAmountMinor called with an unvalidated amount');
  return minor;
}
