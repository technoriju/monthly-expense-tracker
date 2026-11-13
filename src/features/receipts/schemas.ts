import { z } from 'zod';

import { isIsoDate } from '@/utils/dates';
import { MAX_AMOUNT_MINOR } from '@/utils/money';

import type { ReceiptDetailsUpdate, ReceiptItemFlag, ReceiptItemRecord } from './types';

export const RECEIPT_TEXT_MAX_LENGTH = 100;
export const RECEIPT_NUMBER_MAX_LENGTH = 40;
export const RECEIPT_MAX_ITEMS = 200;
/** OCR text kept with a receipt; longer text is cut, never rejected. */
export const OCR_TEXT_MAX_LENGTH = 20_000;
/** 99,999.999 units — far beyond any real receipt line. */
export const MAX_QUANTITY_MILLI = 99_999_999;

const amount = z.number().int().min(0).max(MAX_AMOUNT_MINOR).nullable();
const text = (max: number) => z.string().trim().min(1).max(max).nullable();
const confidence = z.number().min(0).max(1).nullable();
const flags = z.array(
  z.enum(['nameUncertain', 'amountUncertain', 'suspicious', 'quantityMismatch']),
) satisfies z.ZodType<ReceiptItemFlag[]>;

export const receiptItemSchema = z.object({
  itemName: text(RECEIPT_TEXT_MAX_LENGTH),
  originalOcrName: z
    .string()
    .max(RECEIPT_TEXT_MAX_LENGTH * 2)
    .nullable(),
  quantityMilli: z.number().int().min(0).max(MAX_QUANTITY_MILLI).nullable(),
  unit: z.string().trim().max(16).nullable(),
  unitPriceMinor: amount,
  lineTotalMinor: amount,
  nameConfidence: confidence,
  amountConfidence: confidence,
  flags,
  userCorrected: z.boolean(),
}) satisfies z.ZodType<ReceiptItemRecord>;

export const receiptDetailsSchema = z.object({
  vendorName: text(RECEIPT_TEXT_MAX_LENGTH),
  receiptNumber: text(RECEIPT_NUMBER_MAX_LENGTH),
  receiptDate: z.string().refine(isIsoDate).nullable(),
  items: z.array(receiptItemSchema).max(RECEIPT_MAX_ITEMS),
}) satisfies z.ZodType<ReceiptDetailsUpdate>;

export const receiptExtrasSchema = z.object({
  originalOcrText: z.string().nullable(),
  ocrProvider: z.string().max(32).nullable(),
  extractedTotalMinor: amount,
  subtotalMinor: amount,
  taxMinor: amount,
  discountMinor: amount,
  chargesMinor: amount,
  roundOffMinor: z.number().int().min(-MAX_AMOUNT_MINOR).max(MAX_AMOUNT_MINOR).nullable(),
});

/** Draft ids become file names and idempotency keys. */
export const saveKeySchema = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/);
