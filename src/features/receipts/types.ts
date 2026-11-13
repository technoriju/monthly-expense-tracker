import type { MinorAmount, PaymentMethod } from '@/types/money';
import type { IsoDate } from '@/utils/dates';

/**
 * Per-row uncertainty markers. They only inform the user; nothing is guessed or auto-fixed.
 * - `nameUncertain` — item name unreadable or low confidence (may be `null`).
 * - `amountUncertain` — amount read with low confidence or after an OCR character fix.
 * - `suspicious` — conflicting numbers on one line (possibly overwritten / crossed out).
 * - `quantityMismatch` — quantity × unit price ≠ line total.
 */
export type ReceiptItemFlag =
  'nameUncertain' | 'amountUncertain' | 'suspicious' | 'quantityMismatch';

export interface ReceiptItemDraft {
  /** Stable local key for list rendering and editing. */
  key: string;
  name: string | null;
  /** Name exactly as OCR read it, kept for reference. */
  originalOcrName: string | null;
  /** Quantity in thousandths (0.5 kg → 500), so fractional quantities stay integers. */
  quantityMilli: number | null;
  unit: string | null;
  unitPriceMinor: MinorAmount | null;
  lineTotalMinor: MinorAmount | null;
  nameConfidence: number | null;
  amountConfidence: number | null;
  flags: ReceiptItemFlag[];
  userCorrected: boolean;
}

/** Labels a receipt amount line can carry. */
export type ReceiptAmountLabel =
  'grandTotal' | 'subtotal' | 'tax' | 'discount' | 'charges' | 'roundOff';

export interface TotalCandidate {
  amountMinor: MinorAmount;
  /** True for explicit labels (grand total, net payable); false for a bare "total". */
  strong: boolean;
  line: string;
}

export type ReceiptFlag =
  /** Several different grand-total values; the user must choose. */
  | 'totalAmbiguous'
  /** No grand total found. */
  | 'totalMissing'
  /** OCR returned no readable text. */
  | 'noText';

/** What the parser extracted. Every field is a suggestion the user reviews and can edit. */
export interface ParsedReceipt {
  vendorName: string | null;
  receiptDate: IsoDate | null;
  receiptNumber: string | null;
  paymentMethod: PaymentMethod | null;
  items: ReceiptItemDraft[];
  subtotalMinor: MinorAmount | null;
  taxMinor: MinorAmount | null;
  discountMinor: MinorAmount | null;
  chargesMinor: MinorAmount | null;
  /** May be negative. */
  roundOffMinor: MinorAmount | null;
  /** Chosen only when unambiguous; otherwise null with `totalAmbiguous`. */
  grandTotalMinor: MinorAmount | null;
  totalCandidates: TotalCandidate[];
  flags: ReceiptFlag[];
  /** OCR text as recognized, preserved unchanged. */
  originalText: string;
}

/** Receipt fields persisted with a confirmed expense. */
export interface ReceiptRecord {
  /** Review draft id; makes a retried save idempotent. */
  saveKey: string;
  vendorName: string | null;
  receiptNumber: string | null;
  receiptDate: IsoDate | null;
  /** File name inside the app's receipts folder (not a full path), or null without image. */
  imageFile: string | null;
  originalOcrText: string | null;
  ocrProvider: string | null;
  extractedTotalMinor: MinorAmount | null;
  subtotalMinor: MinorAmount | null;
  taxMinor: MinorAmount | null;
  discountMinor: MinorAmount | null;
  chargesMinor: MinorAmount | null;
  roundOffMinor: MinorAmount | null;
}

export interface ReceiptItemRecord {
  itemName: string | null;
  originalOcrName: string | null;
  quantityMilli: number | null;
  unit: string | null;
  unitPriceMinor: MinorAmount | null;
  lineTotalMinor: MinorAmount | null;
  nameConfidence: number | null;
  amountConfidence: number | null;
  flags: ReceiptItemFlag[];
  userCorrected: boolean;
}

export interface ReceiptItem extends ReceiptItemRecord {
  id: number;
  position: number;
}

/** A stored receipt. Its confirmed total is the linked transaction's amount. */
export interface Receipt extends ReceiptRecord {
  id: number;
  transactionId: number;
  items: ReceiptItem[];
  createdAt: number;
  updatedAt: number;
}

/** Editable details of a saved receipt (amount stays with the transaction). */
export interface ReceiptDetailsUpdate {
  vendorName: string | null;
  receiptNumber: string | null;
  receiptDate: IsoDate | null;
  items: ReceiptItemRecord[];
}
