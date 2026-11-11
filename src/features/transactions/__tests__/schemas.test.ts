import {
  createTransactionFormSchema,
  toTransactionInput,
  transactionInputSchema,
  type TransactionFormValues,
} from '../schemas';

const schema = createTransactionFormSchema('INR');

const valid: TransactionFormValues = {
  type: 'expense',
  amount: '250.50',
  categoryId: 3,
  occurredOn: '2025-05-22',
  note: '  Lunch  ',
  paymentMethod: 'upi',
};

function errorsOf(values: Partial<TransactionFormValues>) {
  const result = schema.safeParse({ ...valid, ...values });
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((i) => [i.path[0], i.message]));
}

describe('transaction form schema', () => {
  it('accepts a valid form', () => {
    expect(schema.safeParse(valid).success).toBe(true);
    expect(schema.safeParse({ ...valid, note: '', paymentMethod: null }).success).toBe(true);
  });

  it.each([
    [{ amount: '' }, 'amount', 'amountRequired'],
    [{ amount: '   ' }, 'amount', 'amountRequired'],
    [{ amount: '0' }, 'amount', 'amountInvalid'],
    [{ amount: '-5' }, 'amount', 'amountInvalid'],
    [{ amount: '1.999' }, 'amount', 'amountInvalid'],
    [{ categoryId: null }, 'categoryId', 'categoryRequired'],
    [{ occurredOn: '2025-02-30' }, 'occurredOn', 'dateInvalid'],
    [{ occurredOn: '22/05/2025' }, 'occurredOn', 'dateInvalid'],
    [{ note: 'x'.repeat(201) }, 'note', 'noteTooLong'],
  ] as const)('%p → %s: %s', (values, field, message) => {
    expect(errorsOf(values)[field]).toBe(message);
  });

  it('accepts Indic digits in the amount', () => {
    expect(schema.safeParse({ ...valid, amount: '৫০০' }).success).toBe(true);
  });
});

describe('toTransactionInput', () => {
  it('converts rupees text to integer paise and trims the note', () => {
    expect(toTransactionInput(valid, 'INR')).toEqual({
      type: 'expense',
      amountMinor: 25_050,
      categoryId: 3,
      occurredOn: '2025-05-22',
      note: 'Lunch',
      paymentMethod: 'upi',
    });
  });

  it('stores an empty note as null', () => {
    expect(toTransactionInput({ ...valid, note: '   ' }, 'INR').note).toBeNull();
  });

  it('refuses unvalidated values', () => {
    expect(() => toTransactionInput({ ...valid, amount: 'abc' }, 'INR')).toThrow();
    expect(() => toTransactionInput({ ...valid, categoryId: null }, 'INR')).toThrow();
  });
});

describe('transactionInputSchema (service boundary)', () => {
  const input = toTransactionInput(valid, 'INR');

  it('accepts canonical input', () => {
    expect(transactionInputSchema.safeParse(input).success).toBe(true);
  });

  it.each([
    { amountMinor: 0 },
    { amountMinor: -100 },
    { amountMinor: 10.5 },
    { categoryId: 0 },
    { occurredOn: '2025-13-01' },
    { paymentMethod: 'cheque' },
    { type: 'transfer' },
  ])('rejects %p', (patch) => {
    expect(transactionInputSchema.safeParse({ ...input, ...patch }).success).toBe(false);
  });
});
