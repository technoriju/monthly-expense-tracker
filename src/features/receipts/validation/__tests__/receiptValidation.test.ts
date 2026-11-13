import type { ReceiptItemDraft } from '../../types';
import {
  hasBlockingIssue,
  needsConfirmation,
  validateReceipt,
  type ReceiptValidationInput,
} from '../receiptValidation';

const item = (over: Partial<ReceiptItemDraft> = {}): ReceiptItemDraft => ({
  key: `k${Math.random()}`,
  name: 'Item',
  originalOcrName: 'Item',
  quantityMilli: null,
  unit: null,
  unitPriceMinor: null,
  lineTotalMinor: null,
  nameConfidence: null,
  amountConfidence: null,
  flags: [],
  userCorrected: false,
  ...over,
});

const input = (over: Partial<ReceiptValidationInput> = {}): ReceiptValidationInput => ({
  items: [],
  subtotalMinor: null,
  taxMinor: null,
  discountMinor: null,
  chargesMinor: null,
  roundOffMinor: null,
  extractedTotalMinor: null,
  finalAmountMinor: 10000,
  flags: [],
  ...over,
});
const codes = (over: Partial<ReceiptValidationInput>) =>
  validateReceipt(input(over)).map((i) => i.code);

describe('validateReceipt', () => {
  it('accepts a total-only receipt with no issues', () => {
    expect(validateReceipt(input())).toEqual([]);
  });

  it('blocks a missing, zero, negative, fractional or too-large final amount', () => {
    expect(codes({ finalAmountMinor: null })).toEqual(['finalAmountMissing']);
    for (const bad of [0, -100, 10.5, 1_000_000_000_000]) {
      expect(codes({ finalAmountMinor: bad })).toEqual(['finalAmountInvalid']);
    }
    expect(hasBlockingIssue(validateReceipt(input({ finalAmountMinor: 0 })))).toBe(true);
  });

  it('checks quantity × unit price against the line total (fractional quantities too)', () => {
    const ok = item({ quantityMilli: 1500, unitPriceMinor: 4000, lineTotalMinor: 6000 });
    const bad = item({
      key: 'bad',
      quantityMilli: 2000,
      unitPriceMinor: 4000,
      lineTotalMinor: 9000,
    });
    const issues = validateReceipt(input({ items: [ok, bad], finalAmountMinor: 15000 }));
    expect(issues).toContainEqual({
      code: 'itemQuantityMismatch',
      severity: 'confirm',
      itemKey: 'bad',
      expectedMinor: 8000,
    });
    expect(issues.filter((i) => i.code === 'itemQuantityMismatch')).toHaveLength(1);
  });

  it('compares the item sum with the subtotal', () => {
    const items = [item({ lineTotalMinor: 4000 }), item({ lineTotalMinor: 7200 })];
    const issues = validateReceipt(input({ items, subtotalMinor: 12000, finalAmountMinor: 12000 }));
    expect(issues).toContainEqual({
      code: 'itemsVsSubtotal',
      severity: 'confirm',
      itemsMinor: 11200,
      subtotalMinor: 12000,
    });
  });

  it('checks subtotal + tax + charges − discount ± round-off against the final amount', () => {
    const base = { subtotalMinor: 44150, taxMinor: 2208, roundOffMinor: -58 };
    expect(codes({ ...base, finalAmountMinor: 46300 })).toEqual([]);
    expect(validateReceipt(input({ ...base, finalAmountMinor: 46000 }))).toContainEqual({
      code: 'totalsMismatch',
      severity: 'confirm',
      expectedMinor: 46300,
    });
    expect(
      codes({
        subtotalMinor: 42000,
        discountMinor: 4200,
        chargesMinor: 2000,
        finalAmountMinor: 39800,
      }),
    ).toEqual([]);
  });

  it('does not warn when item prices already include the listed GST', () => {
    const items = [item({ lineTotalMinor: 10500 })];
    expect(codes({ items, taxMinor: 500, finalAmountMinor: 10500 })).toEqual([]);
  });

  it('warns when items do not add up to the final amount', () => {
    const items = [item({ lineTotalMinor: 5200 }), item({ lineTotalMinor: 2000 })];
    expect(codes({ items, finalAmountMinor: 7400 })).toEqual(['finalVsItems']);
  });

  it('asks for confirmation on uncertain or suspicious amounts until the user edits the row', () => {
    const uncertain = item({ key: 'u', lineTotalMinor: 10000, flags: ['amountUncertain'] });
    const suspicious = item({ key: 's', lineTotalMinor: 10000, flags: ['suspicious'] });
    const issues = validateReceipt(
      input({ items: [uncertain, suspicious], finalAmountMinor: 20000 }),
    );
    expect(issues.map((i) => i.code)).toEqual(['itemAmountUncertain', 'itemSuspicious']);
    expect(needsConfirmation(issues)).toBe(true);

    const corrected = [
      { ...uncertain, userCorrected: true },
      { ...suspicious, userCorrected: true },
    ];
    expect(codes({ items: corrected, finalAmountMinor: 20000 })).toEqual([]);
  });

  it('does not require amounts or names on every row', () => {
    const items = [item({ name: null, lineTotalMinor: 3000 }), item({ lineTotalMinor: null })];
    expect(codes({ items, finalAmountMinor: 3000 })).toEqual([]);
  });

  it('requires confirmation for an ambiguous total and notes a changed amount', () => {
    expect(codes({ flags: ['totalAmbiguous'] })).toEqual(['totalAmbiguous']);
    expect(validateReceipt(input({ extractedTotalMinor: 9000 }))).toEqual([
      { code: 'finalVsExtracted', severity: 'info', extractedMinor: 9000 },
    ]);
  });

  it('never changes the values it checks', () => {
    const items = [item({ quantityMilli: 2000, unitPriceMinor: 4000, lineTotalMinor: 9000 })];
    const frozen = JSON.stringify(items);
    validateReceipt(input({ items, subtotalMinor: 1, finalAmountMinor: 5 }));
    expect(JSON.stringify(items)).toBe(frozen);
  });
});
