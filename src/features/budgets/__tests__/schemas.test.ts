import { budgetInputSchema, createBudgetFormSchema, toAmountMinor } from '../schemas';

const schema = createBudgetFormSchema('INR');

function messages(values: Parameters<typeof schema.safeParse>[0]): string[] {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((i) => i.message);
}

describe('budget form schema', () => {
  it('accepts a valid overall budget', () => {
    expect(messages({ budgetType: 'overall', amount: '10,000', categoryId: null })).toEqual([]);
  });

  it('accepts Indic digits and converts to paise without floats', () => {
    expect(messages({ budgetType: 'overall', amount: '১২৫০.৫', categoryId: null })).toEqual([]);
    expect(toAmountMinor('১২৫০.৫', 'INR')).toBe(125_050);
    expect(toAmountMinor('0.10', 'INR')).toBe(10);
  });

  it('requires an amount', () => {
    expect(messages({ budgetType: 'overall', amount: '  ', categoryId: null })).toEqual([
      'amountRequired',
    ]);
  });

  it.each(['0', '-5', 'abc', '10.555', '0.00'])('rejects amount %p', (amount) => {
    expect(messages({ budgetType: 'overall', amount, categoryId: null })).toEqual([
      'amountInvalid',
    ]);
  });

  it('requires a category for category budgets', () => {
    expect(messages({ budgetType: 'category', amount: '500', categoryId: null })).toEqual([
      'categoryRequired',
    ]);
    expect(messages({ budgetType: 'category', amount: '500', categoryId: 3 })).toEqual([]);
  });
});

describe('budget input schema', () => {
  it('requires a positive integer amount and a YYYY-MM month', () => {
    expect(budgetInputSchema.safeParse({ month: '2025-05', amountMinor: 100 }).success).toBe(true);
    expect(budgetInputSchema.safeParse({ month: '2025-05', amountMinor: 0 }).success).toBe(false);
    expect(budgetInputSchema.safeParse({ month: '2025-05', amountMinor: 1.5 }).success).toBe(false);
    expect(budgetInputSchema.safeParse({ month: '2025-00', amountMinor: 1 }).success).toBe(false);
    expect(budgetInputSchema.safeParse({ month: '25-05', amountMinor: 1 }).success).toBe(false);
  });
});
