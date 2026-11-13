/**
 * Synthetic OCR output for parser tests: what a text recognizer might return for each kind of
 * receipt. These are NOT images and say nothing about real OCR accuracy — that needs real
 * receipts on a device (docs/TESTING.md).
 */
import type { OcrLine } from '../../ocr/types';

export const lines = (text: string, confidence: number | null = null): OcrLine[] =>
  text.split('\n').map((t) => ({ text: t, confidence, box: null }));

export const PRINTED_SUPERMARKET = `FRESH MART
12, Park Street, Kolkata 700016
Ph: 033-24567890
GSTIN 19ABCDE1234F1Z5
TAX INVOICE
Bill No: FM-2041   Date: 14/05/2025
Item Qty Rate Amount
1 Basmati Rice 2 kg 120.00 240.00
2 Toor Dal 1 kg 145.50 145.50
3 Amul Milk 2 28.00 56.00
Sub Total 441.50
CGST 2.5% 11.04
SGST 2.5% 11.04
Round Off -0.58
Grand Total 463.00
Paid by UPI
Thank you, visit again`;

export const PRINTED_RESTAURANT = `Hotel Annapurna
Date: 03-04-2025  Time 21:14
Paneer Butter Masala 1 x 240.00 240.00
Butter Naan 4 x 45.00 180.00
Discount 42.00
Packing Charges 20.00
Total Amount Rs. 398.00
Cash 500.00 Change 102.00`;

export const PRINTED_HINDI = `शर्मा किराना स्टोर
दिनांक 10/05/2025
चावल 2 किलो 100.00
चीनी 1 किलो 45.00
कुल राशि ₹ 145.00
नकद`;

/** Bengali with Bengali numerals (what a Bengali-capable engine would return). */
export const MIXED_BENGALI = `মা তারা ভাণ্ডার
তারিখ ১২/০৫/২০২৫
আলু ২ কেজি ৬০
পেঁয়াজ ১ কেজি ৪০
Tea ২০
মোট ১২০`;

/** Handwritten slip: messy names, a clear total. */
export const HANDWRITTEN_NOISY = `S.K. Stores
d~/ 80
Sugr 1kg 45
.., 25
Total 150`;

export const FADED_PARTIAL = `....RT
Br.ad 4O.0O
M.lk 28
T0tal 6B`;

export const TOTAL_ONLY = `Rs 450/-`;

export const TOTAL_ONLY_LABELLED = `Ramesh Tailors
Received with thanks
Total 1,250.00`;

export const MULTIPLE_TOTALS = `City Bakery
Cake 1 350.00
Total 350.00
Total 420.00`;

/** "52.00" was written over "45.00" — two unrelated prices on one line. */
export const OVERWRITTEN = `Corner Shop
Sugar 45.00 52.00
Salt 20.00
Total 74.00`;

export const ITEM_SUM_MISMATCH = `Quick Mart
Bread 40.00
Eggs 72.00
Sub Total 120.00
Grand Total 120.00`;
