import { parseReceipt } from '../../parser/receiptParser';
import { layoutRows } from '../layoutRows';
import { mapMlKitResult } from '../MlKitReceiptOCRProvider';
import type { OcrLine } from '../types';

const line = (text: string, x: number, y: number, width = 100, height = 20): OcrLine => ({
  text,
  confidence: null,
  box: { x, y, width, height },
});

describe('layoutRows', () => {
  it('joins a name column and a price column back into printed rows', () => {
    // Engine order: all names first (one block), then all prices (another block).
    const rows = layoutRows([
      line('Tea', 10, 100),
      line('Samosa', 10, 130),
      line('Total', 10, 170),
      line('20.00', 300, 102),
      line('30.00', 300, 128),
      line('50.00', 300, 171),
    ]);
    expect(rows.map((r) => r.text)).toEqual(['Tea  20.00', 'Samosa  30.00', 'Total  50.00']);
    expect(rows[0]?.box).toEqual({ x: 10, y: 100, width: 390, height: 22 });
  });

  it('keeps slightly tilted rows together and separate rows apart', () => {
    const rows = layoutRows([
      line('Milk', 10, 100),
      line('56.00', 300, 108),
      line('Eggs', 10, 125),
    ]);
    expect(rows.map((r) => r.text)).toEqual(['Milk  56.00', 'Eggs']);
  });

  it('keeps lines without boxes, after the laid-out rows', () => {
    const rows = layoutRows([{ text: 'loose', confidence: null, box: null }, line('Tea 20', 0, 0)]);
    expect(rows.map((r) => r.text)).toEqual(['Tea 20', 'loose']);
  });
});

describe('mapMlKitResult', () => {
  it('maps native blocks to rows the parser can read', () => {
    const lines = mapMlKitResult({
      text: 'ignored',
      blocks: [
        {
          text: 'Shop',
          lines: [{ text: 'Corner Shop', boundingBox: { x: 50, y: 10, width: 200, height: 24 } }],
        },
        {
          text: 'names',
          lines: [
            { text: 'Bread', boundingBox: { x: 10, y: 60, width: 80, height: 20 } },
            { text: 'Grand Total', boundingBox: { x: 10, y: 100, width: 120, height: 20 } },
          ],
        },
        {
          text: 'prices',
          lines: [
            { text: '40.00', boundingBox: { x: 250, y: 61, width: 60, height: 20 } },
            { text: '40.00', boundingBox: { x: 250, y: 99, width: 60, height: 20 } },
          ],
        },
        { text: 'no box', lines: [{ text: 'Thanks', boundingBox: {} }] },
      ],
    });
    expect(lines.map((l) => l.text)).toEqual([
      'Corner Shop',
      'Bread  40.00',
      'Grand Total  40.00',
      'Thanks',
    ]);
    expect(lines.every((l) => l.confidence === null)).toBe(true);
    const parsed = parseReceipt(lines, { today: new Date(2025, 4, 22) });
    expect(parsed.vendorName).toBe('Corner Shop');
    expect(parsed.items.map((i) => [i.name, i.lineTotalMinor])).toEqual([['Bread', 4000]]);
    expect(parsed.grandTotalMinor).toBe(4000);
  });
});
