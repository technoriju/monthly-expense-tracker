import { parseAmount } from '../amountParser';
import { matchCategory } from '../categoryMatcher';
import { parseDate } from '../dateParser';
import { normalizeText, tokenize } from '../normalizeText';
import { findNumberGroups } from '../numberWords';
import { matchPaymentMethod } from '../paymentMethodMatcher';
import { parseVoiceExpense } from '../voiceExpenseParser';

const tokens = (text: string) => tokenize(normalizeText(text));
/** First number in `text`, in rupees. */
const firstNumber = (text: string) => {
  const [group] = findNumberGroups(tokens(text));
  return group ? group.value / 100 : null;
};
const amount = (text: string) => parseAmount(tokens(text), 'INR');
const TODAY = new Date(2025, 4, 22);

describe('normalizeText', () => {
  it('converts Bengali and Devanagari numerals to ASCII', () => {
    expect(normalizeText('৫০ টাকা')).toBe('50 টাকা');
    expect(normalizeText('१२० रुपये')).toBe('120 रुपये');
  });

  it('removes grouping commas, punctuation and splits digits from words', () => {
    expect(normalizeText('Paid ₹1,25,000.')).toBe('paid ₹ 125000');
    expect(normalizeText('৫০০টাকার')).toBe('500 টাকার');
    expect(normalizeText('Rs.50, thanks!')).toBe('rs 50 thanks');
  });

  it('keeps decimal points between digits only', () => {
    expect(normalizeText('75.50 on juice.')).toBe('75.50 on juice');
  });

  it('strips nukta so spelling variants compare equal', () => {
    expect(normalizeText('हज़ार')).toBe(normalizeText('हजार'));
    expect(normalizeText('আড়াই')).toBe(normalizeText('আড়াই'));
  });
});

describe('Indian number words', () => {
  it.each([
    ['fifty', 50],
    ['forty five', 45],
    ['two hundred', 200],
    ['one hundred and fifty', 150],
    ['two thousand five hundred', 2500],
    ['a hundred', 100],
    ['one lakh', 100_000],
    ['two lakh fifty thousand', 250_000],
    ['one crore', 10_000_000],
    ['5 k', 5000],
    ['2.5 lakh', 250_000],
    ['1 lakh 20 thousand', 120_000],
  ])('English: %s → %d', (text, value) => expect(firstNumber(text)).toBe(value));

  it.each([
    ['পঞ্চাশ', 50],
    ['পঁচাত্তর', 75],
    ['নিরানব্বই', 99],
    ['একশো', 100],
    ['পাঁচশো', 500],
    ['বারোশো', 1200],
    ['দেড়শো', 150],
    ['আড়াইশো', 250],
    ['সাড়ে তিনশো', 350],
    ['দেড় হাজার', 1500],
    ['আড়াই হাজার', 2500],
    ['সোয়া দুশো', 225],
    ['দুই হাজার পাঁচশো', 2500],
    ['এক লাখ', 100_000],
    ['২ হাজার', 2000],
  ])('Bengali: %s → %d', (text, value) => expect(firstNumber(text)).toBe(value));

  it.each([
    ['पचास', 50],
    ['निन्यानवे', 99],
    ['सौ', 100],
    ['डेढ़ सौ', 150],
    ['ढाई सौ', 250],
    ['साढ़े तीन सौ', 350],
    ['सवा सौ', 125],
    ['पौने दो सौ', 175],
    ['दो हज़ार पांच सौ', 2500],
    ['ढाई हजार', 2500],
    ['एक लाख', 100_000],
    ['दो करोड़', 20_000_000],
  ])('Hindi: %s → %d', (text, value) => expect(firstNumber(text)).toBe(value));

  it('keeps separate numbers apart', () => {
    expect(findNumberGroups(tokens('100 200')).map((g) => g.value / 100)).toEqual([100, 200]);
    expect(findNumberGroups(tokens('fifty sixty')).map((g) => g.value / 100)).toEqual([50, 60]);
  });

  it('ignores text without numbers', () => {
    expect(findNumberGroups(tokens('spent on tea'))).toEqual([]);
  });
});

describe('parseAmount', () => {
  it('extracts integer paise from English and Bengali amounts', () => {
    expect(amount('I spent 50 rupees on tea')).toEqual({ amountMinor: 5000, uncertain: false });
    expect(amount('৫০ টাকা চা')).toEqual({ amountMinor: 5000, uncertain: false });
    expect(amount('spent 75.50')).toEqual({ amountMinor: 7550, uncertain: false });
  });

  it.each([
    '₹ 120',
    'Rs 120',
    '120 rs',
    '120 INR',
    '120 rupees',
    '120 টাকা',
    '120 টাকার',
    '120 रुपये',
    '120 रुपए',
  ])('normalizes the rupee expression "%s"', (text) =>
    expect(amount(text).amountMinor).toBe(12_000),
  );

  it('prefers the number next to a currency word', () => {
    expect(amount('bought 2 kg rice for 120 rupees').amountMinor).toBe(12_000);
  });

  it('does not invent an amount when none was spoken', () => {
    expect(amount('spent money on lunch')).toEqual({ amountMinor: null, uncertain: false });
  });

  it('refuses to choose between different unmarked or marked amounts', () => {
    expect(amount('tea 20 and samosa 30')).toEqual({ amountMinor: null, uncertain: true });
    expect(amount('10 rupees and 20 rupees')).toEqual({ amountMinor: null, uncertain: true });
  });

  it('rejects amounts above the app limit and fractions finer than paise', () => {
    expect(amount('99999999999 rupees').amountMinor).toBeNull();
    expect(amount('10.555 rupees').amountMinor).toBeNull();
  });
});

describe('parseDate', () => {
  it.each([
    ['spent today', '2025-05-22', false],
    ['nothing said', '2025-05-22', false],
    ['yesterday lunch', '2025-05-21', false],
    ['day before yesterday', '2025-05-20', false],
    ['আজ চা', '2025-05-22', false],
    ['গতকাল বাস', '2025-05-21', false],
    ['কাল বাজার', '2025-05-21', true],
    ['পরশু', '2025-05-20', true],
    ['आज चाय', '2025-05-22', false],
    ['कल ऑटो', '2025-05-21', true],
    ['परसों बस', '2025-05-20', true],
  ])('%s → %s (uncertain %s)', (text, occurredOn, uncertain) => {
    expect(parseDate(tokens(text), TODAY)).toEqual({ occurredOn, uncertain });
  });
});

describe('matchCategory', () => {
  it.each([
    ['tea', 'food'],
    ['groceries', 'groceries'],
    ['electricity', 'bills'],
    ['বাজারে', 'bazar'],
    ['বিদ্যুতের বিল', 'bills'],
    ['যাতায়াতে', 'transportation'],
    ['बिजली का बिल', 'bills'],
    ['chai', 'food'],
  ])('%s → %s', (text, key) => {
    expect(matchCategory(tokens(text))).toEqual({ categoryKey: key, uncertain: false });
  });

  it('lets a longer phrase win over the words inside it', () => {
    expect(matchCategory(tokens('বাড়ি ভাড়া')).categoryKey).toBe('rent');
    expect(matchCategory(tokens('মুদি বাজার')).categoryKey).toBe('groceries');
    expect(matchCategory(tokens('बस का किराया')).categoryKey).toBe('transportation');
  });

  it('leaves the category empty when two categories match', () => {
    expect(matchCategory(tokens('doctor fees'))).toEqual({ categoryKey: null, uncertain: true });
  });

  it('never falls back to a default category', () => {
    expect(matchCategory(tokens('spent 50 rupees'))).toEqual({
      categoryKey: null,
      uncertain: false,
    });
  });

  it('does not treat the ambiguous fare/rent word alone as a category', () => {
    expect(matchCategory(tokens('ভাড়া ২০০ টাকা')).categoryKey).toBeNull();
    expect(matchCategory(tokens('किराया 200')).categoryKey).toBeNull();
  });
});

describe('matchPaymentMethod', () => {
  it.each([
    ['paid by cash', 'cash'],
    ['via gpay', 'upi'],
    ['google pay', 'upi'],
    ['debit card', 'card'],
    ['নগদে', 'cash'],
    ['नकद', 'cash'],
    ['neft', 'bank_transfer'],
  ])('%s → %s', (text, method) => expect(matchPaymentMethod(tokens(text))).toBe(method));

  it('returns null when none or several methods are mentioned', () => {
    expect(matchPaymentMethod(tokens('tea 50'))).toBeNull();
    expect(matchPaymentMethod(tokens('half cash half upi'))).toBeNull();
  });
});

describe('parseVoiceExpense — draft', () => {
  const parse = (text: string) =>
    parseVoiceExpense(text, { language: 'en', currency: 'INR', today: TODAY });

  it('builds a complete draft with the recognized text as the note', () => {
    expect(parse('  I spent 50 rupees on tea  ')).toEqual({
      amountMinor: 5000,
      categoryKey: 'food',
      occurredOn: '2025-05-22',
      note: 'I spent 50 rupees on tea',
      paymentMethod: null,
      recognizedText: 'I spent 50 rupees on tea',
      language: 'en',
      missingFields: [],
      uncertainFields: [],
      status: 'complete',
    });
  });

  it('marks a missing amount and keeps the rest', () => {
    const draft = parse('lunch today');
    expect(draft.amountMinor).toBeNull();
    expect(draft.missingFields).toEqual(['amount']);
    expect(draft.status).toBe('incomplete');
  });

  it('marks an uncertain category as missing and uncertain', () => {
    const draft = parse('doctor fees 700 rupees');
    expect(draft.categoryKey).toBeNull();
    expect(draft.missingFields).toEqual(['category']);
    expect(draft.uncertainFields).toEqual(['category']);
  });

  it('flags ambiguous amounts and dates', () => {
    expect(parse('tea 20 and samosa 30').uncertainFields).toEqual(['amount']);
    expect(
      parseVoiceExpense('कल 50 रुपये चाय', { language: 'hi', currency: 'INR', today: TODAY })
        .uncertainFields,
    ).toEqual(['date']);
  });

  it('handles empty speech', () => {
    const draft = parse('   ');
    expect(draft.missingFields).toEqual(['amount', 'category']);
    expect(draft.note).toBe('');
  });

  it('caps the note at the note length limit', () => {
    expect(parse('tea '.repeat(100)).note.length).toBe(200);
  });
});
