import type { MinorAmount } from '@/types/money';
import { MAX_AMOUNT_MINOR } from '@/utils/money';

import { multiplyQuantity } from '../parser/receiptParser';
import type { ReceiptFlag, ReceiptItemDraft } from '../types';

/**
 * - `blocking` — cannot save until fixed.
 * - `confirm` — the user must tick "I've checked the amount" to save (explicit override).
 * - `info` — shown, never blocks.
 */
export type IssueSeverity = 'blocking' | 'confirm' | 'info';

export type ReceiptIssue =
  | { code: 'finalAmountMissing'; severity: 'blocking' }
  | { code: 'finalAmountInvalid'; severity: 'blocking' }
  | { code: 'totalAmbiguous'; severity: 'confirm' }
  | { code: 'totalMissing'; severity: 'info' }
  | { code: 'itemAmountUncertain'; severity: 'confirm'; itemKey: string }
  | { code: 'itemSuspicious'; severity: 'confirm'; itemKey: string }
  | {
      code: 'itemQuantityMismatch';
      severity: 'confirm';
      itemKey: string;
      expectedMinor: MinorAmount;
    }
  | {
      code: 'itemsVsSubtotal';
      severity: 'confirm';
      itemsMinor: MinorAmount;
      subtotalMinor: MinorAmount;
    }
  | { code: 'totalsMismatch'; severity: 'confirm'; expectedMinor: MinorAmount }
  | { code: 'finalVsItems'; severity: 'confirm'; itemsMinor: MinorAmount }
  | { code: 'finalVsExtracted'; severity: 'info'; extractedMinor: MinorAmount };

export interface ReceiptValidationInput {
  items: readonly ReceiptItemDraft[];
  subtotalMinor: MinorAmount | null;
  taxMinor: MinorAmount | null;
  discountMinor: MinorAmount | null;
  chargesMinor: MinorAmount | null;
  roundOffMinor: MinorAmount | null;
  /** Grand total OCR found (null when none or ambiguous). */
  extractedTotalMinor: MinorAmount | null;
  /** Amount the user will save; null while the field is empty or unparsable. */
  finalAmountMinor: MinorAmount | null;
  /** Parser flags still open (the user resolves `totalAmbiguous` by choosing an amount). */
  flags: readonly ReceiptFlag[];
}

/** Sum of the item line totals that have an amount. */
export function sumItems(items: readonly ReceiptItemDraft[]): MinorAmount {
  return items.reduce((sum, item) => sum + (item.lineTotalMinor ?? 0), 0);
}

/**
 * Checks a receipt draft and reports every discrepancy. Pure and read-only: amounts are never
 * adjusted to make totals match — the user decides.
 */
export function validateReceipt(input: ReceiptValidationInput): ReceiptIssue[] {
  const issues: ReceiptIssue[] = [];
  const final = input.finalAmountMinor;
  if (final === null) {
    issues.push({ code: 'finalAmountMissing', severity: 'blocking' });
  } else if (!Number.isInteger(final) || final <= 0 || final > MAX_AMOUNT_MINOR) {
    issues.push({ code: 'finalAmountInvalid', severity: 'blocking' });
  }
  if (input.flags.includes('totalAmbiguous')) {
    issues.push({ code: 'totalAmbiguous', severity: 'confirm' });
  }
  if (input.flags.includes('totalMissing') && input.items.length > 0) {
    issues.push({ code: 'totalMissing', severity: 'info' });
  }

  for (const item of input.items) {
    if (item.userCorrected) continue; // the user has looked at this row
    if (item.flags.includes('amountUncertain') && item.lineTotalMinor !== null) {
      issues.push({ code: 'itemAmountUncertain', severity: 'confirm', itemKey: item.key });
    }
    if (item.flags.includes('suspicious')) {
      issues.push({ code: 'itemSuspicious', severity: 'confirm', itemKey: item.key });
    }
  }
  for (const item of input.items) {
    const { quantityMilli, unitPriceMinor, lineTotalMinor } = item;
    if (quantityMilli === null || unitPriceMinor === null || lineTotalMinor === null) continue;
    const expected = multiplyQuantity(quantityMilli, unitPriceMinor);
    if (Math.abs(expected - lineTotalMinor) > 1) {
      issues.push({
        code: 'itemQuantityMismatch',
        severity: 'confirm',
        itemKey: item.key,
        expectedMinor: expected,
      });
    }
  }

  const priced = input.items.filter((i) => i.lineTotalMinor !== null);
  const itemsMinor = sumItems(priced);
  if (priced.length > 0 && input.subtotalMinor !== null && itemsMinor !== input.subtotalMinor) {
    issues.push({
      code: 'itemsVsSubtotal',
      severity: 'confirm',
      itemsMinor,
      subtotalMinor: input.subtotalMinor,
    });
  }

  if (final !== null && final > 0) {
    const hasComponents =
      input.taxMinor !== null ||
      input.discountMinor !== null ||
      input.chargesMinor !== null ||
      input.roundOffMinor !== null;
    const base = input.subtotalMinor ?? (priced.length > 0 ? itemsMinor : null);
    // Item prices often already include GST; when the items alone match, the tax is a breakdown.
    const itemsMatch = priced.length > 0 && itemsMinor === final;
    if (base !== null && (hasComponents || input.subtotalMinor !== null) && !itemsMatch) {
      const expected =
        base +
        (input.taxMinor ?? 0) +
        (input.chargesMinor ?? 0) -
        (input.discountMinor ?? 0) +
        (input.roundOffMinor ?? 0);
      if (expected !== final) {
        issues.push({ code: 'totalsMismatch', severity: 'confirm', expectedMinor: expected });
      }
    } else if (!hasComponents && input.subtotalMinor === null && priced.length > 0 && !itemsMatch) {
      issues.push({ code: 'finalVsItems', severity: 'confirm', itemsMinor });
    }
    if (input.extractedTotalMinor !== null && input.extractedTotalMinor !== final) {
      issues.push({
        code: 'finalVsExtracted',
        severity: 'info',
        extractedMinor: input.extractedTotalMinor,
      });
    }
  }
  return issues;
}

export function hasBlockingIssue(issues: readonly ReceiptIssue[]): boolean {
  return issues.some((i) => i.severity === 'blocking');
}

export function needsConfirmation(issues: readonly ReceiptIssue[]): boolean {
  return issues.some((i) => i.severity === 'confirm');
}
