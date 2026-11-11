import { formatMoney, formatMoneyFallback, formatPercentBp } from '../format';
import { isWholeAmount } from '../money';

describe('formatMoney (en-IN)', () => {
  it('omits decimals for whole rupee amounts', () => {
    expect(formatMoney(7_500_000, 'INR', 'en-IN')).toBe('₹75,000');
  });

  it('uses Indian lakh grouping', () => {
    expect(formatMoney(123_456_700, 'INR', 'en-IN')).toBe('₹12,34,567');
  });

  it('shows paise when present', () => {
    expect(formatMoney(12_345, 'INR', 'en-IN')).toBe('₹123.45');
  });

  it('formats signed amounts', () => {
    expect(formatMoney(-50_000, 'INR', 'en-IN', { signDisplay: 'exceptZero' })).toBe('-₹500');
    expect(formatMoney(50_000, 'INR', 'en-IN', { signDisplay: 'exceptZero' })).toBe('+₹500');
  });

  it('keeps Latin digits for Bengali and Hindi locales', () => {
    expect(formatMoney(7_500_000, 'INR', 'bn-IN')).toMatch(/75,000/);
    expect(formatMoney(7_500_000, 'INR', 'hi-IN')).toMatch(/75,000/);
  });
});

describe('formatMoneyFallback', () => {
  it('groups in lakhs and prefixes the symbol', () => {
    expect(formatMoneyFallback(123_456_700, 'INR', 0, 'auto')).toBe('₹12,34,567');
  });

  it('handles small amounts, paise and signs', () => {
    expect(formatMoneyFallback(50_000, 'INR', 0, 'auto')).toBe('₹500');
    expect(formatMoneyFallback(5, 'INR', 2, 'auto')).toBe('₹0.05');
    expect(formatMoneyFallback(-50_000, 'INR', 0, 'exceptZero')).toBe('-₹500');
    expect(formatMoneyFallback(50_000, 'INR', 0, 'always')).toBe('+₹500');
    expect(formatMoneyFallback(0, 'INR', 0, 'exceptZero')).toBe('₹0');
  });
});

describe('isWholeAmount', () => {
  it('detects whole rupees from minor units', () => {
    expect(isWholeAmount(50_000, 'INR')).toBe(true);
    expect(isWholeAmount(50_050, 'INR')).toBe(false);
  });
});

describe('formatPercentBp', () => {
  it('formats basis points as a percentage with up to one decimal', () => {
    expect(formatPercentBp(3_800, 'en-IN')).toBe('38%');
    expect(formatPercentBp(4_309, 'en-IN')).toBe('43.1%');
    expect(formatPercentBp(0, 'en-IN')).toBe('0%');
  });

  it('can show a sign', () => {
    expect(formatPercentBp(2_500, 'en-IN', { signDisplay: 'exceptZero' })).toBe('+25%');
    expect(formatPercentBp(-2_500, 'en-IN', { signDisplay: 'exceptZero' })).toBe('-25%');
  });

  it('keeps Latin digits for Bengali and Hindi locales', () => {
    expect(formatPercentBp(3_800, 'bn-IN')).toMatch(/38/);
    expect(formatPercentBp(3_800, 'hi-IN')).toMatch(/38/);
  });
});
