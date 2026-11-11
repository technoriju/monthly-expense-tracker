import { formatMoney } from '../format';
import { minorToInputString, parseAmountToMinor } from '../money';

describe('parseAmountToMinor (rupees → integer paise)', () => {
  it.each([
    ['500', 50_000],
    ['0.5', 50],
    ['0.05', 5],
    ['12.34', 1_234],
    ['12.3', 1_230],
    ['12.', 1_200],
    ['1,250.75', 125_075],
    ['  99  ', 9_900],
    ['₹ 1,00,000', 10_000_000],
    ['007', 700],
    ['১২৩.৫', 12_350],
    ['१,२००', 120_000],
    ['9999999999.99', 999_999_999_999],
  ])('%s → %d', (input, expected) => {
    expect(parseAmountToMinor(input, 'INR')).toBe(expected);
  });

  it('never suffers float error (0.1 + 0.2 style inputs)', () => {
    expect(parseAmountToMinor('0.29', 'INR')).toBe(29);
    expect(parseAmountToMinor('1.15', 'INR')).toBe(115);
    expect(parseAmountToMinor('4.35', 'INR')).toBe(435);
  });

  it.each(['', '0', '0.00', '-1', '1.234', 'abc', '1e3', '.5', '1.2.3', '10000000000', 'NaN'])(
    'rejects %p',
    (input) => {
      expect(parseAmountToMinor(input, 'INR')).toBeNull();
    },
  );
});

describe('minorToInputString (paise → editable rupees)', () => {
  it.each([
    [50_000, '500'],
    [125_075, '1250.75'],
    [1_230, '12.30'],
    [5, '0.05'],
  ])('%d → %s', (minor, expected) => {
    expect(minorToInputString(minor, 'INR')).toBe(expected);
  });

  it('round-trips through parseAmountToMinor', () => {
    for (const minor of [1, 99, 100, 12_345, 999_999_999_999]) {
      expect(parseAmountToMinor(minorToInputString(minor, 'INR'), 'INR')).toBe(minor);
    }
  });
});

describe('paise → display (formatMoney)', () => {
  it('formats paise as rupees with Indian grouping', () => {
    expect(formatMoney(125_075, 'INR', 'en-IN')).toBe('₹1,250.75');
    expect(formatMoney(10_000_000, 'INR', 'en-IN')).toBe('₹1,00,000');
    expect(formatMoney(5, 'INR', 'en-IN')).toBe('₹0.05');
  });
});
