import { findNumberTokens } from '../numberTokens';

const minors = (line: string) => findNumberTokens(line).map((t) => t.minor);

describe('findNumberTokens', () => {
  it('reads plain, decimal and currency-marked amounts as integer paise', () => {
    expect(minors('Tea 20')).toEqual([2000]);
    expect(minors('Rice 120.50')).toEqual([12050]);
    expect(minors('Total ₹ 450.00')).toEqual([45000]);
    expect(minors('Total Rs.450')).toEqual([45000]);
    expect(minors('Paid INR 99.9')).toEqual([9990]);
    expect(minors('Total Rs 500/-')).toEqual([50000]);
  });

  it('accepts Indian and Western grouping', () => {
    expect(minors('Total 1,23,456.50')).toEqual([12345650]);
    expect(minors('Total 123,456.50')).toEqual([12345650]);
    expect(minors('Total 12,500')).toEqual([1250000]);
  });

  it('converts Bengali and Devanagari numerals', () => {
    expect(minors('মোট ১,২৫০.৫০')).toEqual([125050]);
    expect(minors('कुल ४५०')).toEqual([45000]);
    expect(minors('চা ২০')).toEqual([2000]);
  });

  it('rejects invalid grouping and more than two decimals as money', () => {
    const [bad] = findNumberTokens('Item 1,2,3');
    expect(bad?.minor).toBeNull();
    const [three] = findNumberTokens('Onion 0.250 kg');
    expect(three?.minor).toBeNull();
    expect(three?.milli).toBe(250);
  });

  it('reads a decimal comma as decimals and flags it', () => {
    const [token] = findNumberTokens('Milk 56,50');
    expect(token?.minor).toBe(5650);
    expect(token?.corrected).toBe(true);
  });

  it('ignores dates, times, percentages, phone numbers and GSTIN', () => {
    expect(minors('Date 12/05/2025 10:45')).toEqual([]);
    expect(minors('CGST 2.5%')).toEqual([]);
    expect(findNumberTokens('Ph 9876543210')[0]?.minor).toBeNull();
    expect(minors('GSTIN 19ABCDE1234F1Z5')).toEqual([]);
  });

  it('fixes OCR look-alike letters inside numbers and flags them', () => {
    const [token] = findNumberTokens('Bread 4O.0O');
    expect(token?.minor).toBe(4000);
    expect(token?.corrected).toBe(true);
    // Words are never rewritten.
    expect(findNumberTokens('SOIL')).toEqual([]);
  });

  it('marks negative values and keeps zero as zero', () => {
    expect(findNumberTokens('Round off -0.40')[0]).toMatchObject({ minor: 40, negative: true });
    expect(findNumberTokens('Discount (20.00)')[0]).toMatchObject({ minor: 2000, negative: true });
    expect(minors('Tip 0.00')).toEqual([0]);
  });

  it('rejects amounts above the app ceiling', () => {
    expect(minors('Total ₹ 99,99,99,99,999.00')).toEqual([null]);
  });
});
