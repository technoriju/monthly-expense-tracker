import * as F from '../__fixtures__/receiptFixtures';
import { findDate, parseReceipt } from '../receiptParser';

const TODAY = new Date(2025, 4, 22);
const parse = (text: string, confidence: number | null = null) =>
  parseReceipt(F.lines(text, confidence), { today: TODAY });
const itemSummary = (text: string) =>
  parse(text).items.map((i) => [i.name, i.quantityMilli, i.unitPriceMinor, i.lineTotalMinor]);

describe('parseReceipt — printed receipts', () => {
  it('reads a GST supermarket bill: header, items, subtotal, tax, round-off, total', () => {
    const r = parse(F.PRINTED_SUPERMARKET);
    expect(r.vendorName).toBe('FRESH MART');
    expect(r.receiptDate).toBe('2025-05-14');
    expect(r.receiptNumber).toBe('FM-2041');
    expect(r.paymentMethod).toBe('upi');
    expect(itemSummary(F.PRINTED_SUPERMARKET)).toEqual([
      ['Basmati Rice', 2000, 12000, 24000],
      ['Toor Dal', 1000, 14550, 14550],
      ['Amul Milk', 2000, 2800, 5600],
    ]);
    expect(r.items[0]?.unit).toBe('kg');
    expect(r.subtotalMinor).toBe(44150);
    expect(r.taxMinor).toBe(2208);
    expect(r.roundOffMinor).toBe(-58);
    expect(r.grandTotalMinor).toBe(46300);
    expect(r.flags).toEqual([]);
    expect(r.items.every((i) => i.flags.length === 0)).toBe(true);
  });

  it('ignores the address PIN code, phone number and GSTIN', () => {
    const r = parse(F.PRINTED_SUPERMARKET);
    expect(r.items.map((i) => i.name)).not.toContain('Park Street, Kolkata');
    expect(r.items).toHaveLength(3);
  });

  it('reads "qty x price" rows, discount and packing charges; ignores cash/change', () => {
    const r = parse(F.PRINTED_RESTAURANT);
    expect(r.vendorName).toBe('Hotel Annapurna');
    expect(r.receiptDate).toBe('2025-04-03');
    expect(itemSummary(F.PRINTED_RESTAURANT)).toEqual([
      ['Paneer Butter Masala', 1000, 24000, 24000],
      ['Butter Naan', 4000, 4500, 18000],
    ]);
    expect(r.discountMinor).toBe(4200);
    expect(r.chargesMinor).toBe(2000);
    expect(r.grandTotalMinor).toBe(39800);
    expect(r.paymentMethod).toBe('cash');
  });

  it('reads a Hindi receipt with Hindi units and total label', () => {
    const r = parse(F.PRINTED_HINDI);
    expect(r.vendorName).toBe('शर्मा किराना स्टोर');
    expect(r.receiptDate).toBe('2025-05-10');
    expect(itemSummary(F.PRINTED_HINDI)).toEqual([
      ['चावल', 2000, null, 10000],
      ['चीनी', 1000, null, 4500],
    ]);
    expect(r.grandTotalMinor).toBe(14500);
    expect(r.paymentMethod).toBe('cash');
  });
});

describe('parseReceipt — Bengali and mixed language', () => {
  it('reads Bengali numerals, Bengali units and the মোট total', () => {
    const r = parse(F.MIXED_BENGALI);
    expect(r.vendorName).toBe('মা তারা ভাণ্ডার');
    expect(r.receiptDate).toBe('2025-05-12');
    expect(itemSummary(F.MIXED_BENGALI)).toEqual([
      ['আলু', 2000, null, 6000],
      ['পেঁয়াজ', 1000, null, 4000],
      ['Tea', null, null, 2000],
    ]);
    expect(r.grandTotalMinor).toBe(12000);
  });
});

describe('parseReceipt — handwriting and uncertainty', () => {
  it('keeps a clear amount when the name is unreadable (scenarios A and G)', () => {
    const r = parse(F.HANDWRITTEN_NOISY);
    const [first, , third] = r.items;
    expect(first).toMatchObject({ name: null, lineTotalMinor: 8000 });
    expect(first?.flags).toContain('nameUncertain');
    expect(third).toMatchObject({ name: null, lineTotalMinor: 2500 });
    expect(r.grandTotalMinor).toBe(15000);
  });

  it('flags every row of a low-confidence scan but keeps names and amounts (scenario C)', () => {
    const r = parse(F.PRINTED_RESTAURANT, 0.4);
    expect(r.items[0]).toMatchObject({ name: 'Paneer Butter Masala', lineTotalMinor: 24000 });
    for (const item of r.items) {
      expect(item.flags).toEqual(expect.arrayContaining(['nameUncertain', 'amountUncertain']));
      expect(item.nameConfidence).toBe(0.4);
    }
  });

  it('flags OCR-corrected amounts and refuses unreadable totals on faded receipts', () => {
    const r = parse(F.FADED_PARTIAL);
    expect(r.items[0]).toMatchObject({ lineTotalMinor: 4000 });
    expect(r.items[0]?.flags).toContain('amountUncertain');
    // "T0tal 6B": the label is recognised, the amount is not readable — nothing is invented.
    expect(r.grandTotalMinor).toBeNull();
    expect(r.flags).toContain('totalMissing');
  });

  it('flags two unrelated prices on one line as possibly overwritten (scenario F)', () => {
    const r = parse(F.OVERWRITTEN);
    expect(r.items[0]?.flags).toContain('suspicious');
    expect(r.items[0]).toMatchObject({ unitPriceMinor: 4500, lineTotalMinor: 5200 });
  });
});

describe('parseReceipt — totals', () => {
  it('treats a lone unnamed amount as a total-only receipt (scenario D)', () => {
    const r = parse(F.TOTAL_ONLY);
    expect(r.items).toEqual([]);
    expect(r.grandTotalMinor).toBe(45000);
    expect(r.flags).toEqual([]);
  });

  it('reads a labelled total with no items', () => {
    const r = parse(F.TOTAL_ONLY_LABELLED);
    expect(r.vendorName).toBe('Ramesh Tailors');
    expect(r.items).toEqual([]);
    expect(r.grandTotalMinor).toBe(125000);
  });

  it('does not pick between different totals (scenario E)', () => {
    const r = parse(F.MULTIPLE_TOTALS);
    expect(r.grandTotalMinor).toBeNull();
    expect(r.flags).toContain('totalAmbiguous');
    expect(r.totalCandidates.map((c) => c.amountMinor)).toEqual([35000, 42000]);
  });

  it('prefers an explicit "Grand Total" over a bare "Total"', () => {
    const r = parse('Shop\nTea 20.00\nTotal 20.00\nGST 1.00\nGrand Total 21.00');
    expect(r.grandTotalMinor).toBe(2100);
    expect(r.flags).toEqual([]);
  });

  it('never treats item counts as totals', () => {
    const r = parse('Shop\nTea 20.00\nTotal Qty 3\nTotal 20.00');
    expect(r.grandTotalMinor).toBe(2000);
  });

  it('preserves the original OCR text and reports empty scans', () => {
    expect(parse(F.TOTAL_ONLY).originalText).toBe(F.TOTAL_ONLY);
    const empty = parse('  \n ');
    expect(empty.flags).toEqual(['noText', 'totalMissing']);
  });
});

describe('findDate', () => {
  it('reads day-first, ISO and month-name dates and rejects future or invalid ones', () => {
    expect(findDate('Date: 05/03/25', TODAY)).toBe('2025-03-05');
    expect(findDate('2025-05-01', TODAY)).toBe('2025-05-01');
    expect(findDate('12 May 2025', TODAY)).toBe('2025-05-12');
    expect(findDate('৩১/১২/২০২৪', TODAY)).toBe('2024-12-31');
    expect(findDate('31/02/2025', TODAY)).toBeNull();
    expect(findDate('01/06/2025', TODAY)).toBeNull(); // after "today"
  });
});
