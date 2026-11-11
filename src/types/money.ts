/** Amount in integer minor units (paise for INR). Never a float. */
export type MinorAmount = number;

/** ISO 4217 codes supported by the app. Extend together with `CURRENCIES` in utils/money.ts. */
export type CurrencyCode = 'INR';

export type TransactionType = 'income' | 'expense';
