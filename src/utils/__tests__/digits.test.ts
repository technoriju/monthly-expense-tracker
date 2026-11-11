import { normalizeDigits } from '../digits';

describe('normalizeDigits', () => {
  it.each([
    ['Bengali', '০১২৩৪৫৬৭৮৯'],
    ['Devanagari', '०१२३४५६७८९'],
    ['Gujarati', '૦૧૨૩૪૫૬૭૮૯'],
    ['Gurmukhi', '੦੧੨੩੪੫੬੭੮੯'],
    ['Odia', '୦୧୨୩୪୫୬୭୮୯'],
    ['Tamil', '௦௧௨௩௪௫௬௭௮௯'],
    ['Telugu', '౦౧౨౩౪౫౬౭౮౯'],
    ['Kannada', '೦೧೨೩೪೫೬೭೮೯'],
    ['Malayalam', '൦൧൨൩൪൫൬൭൮൯'],
    ['Extended Arabic-Indic', '۰۱۲۳۴۵۶۷۸۹'],
    ['Arabic-Indic', '٠١٢٣٤٥٦٧٨٩'],
    ['Ol Chiki', '᱐᱑᱒᱓᱔᱕᱖᱗᱘᱙'],
    ['Meetei Mayek', '꯰꯱꯲꯳꯴꯵꯶꯷꯸꯹'],
  ])('maps %s digits to ASCII', (_name, digits) => {
    expect(normalizeDigits(digits)).toBe('0123456789');
  });

  it('keeps non-digit characters and ASCII digits unchanged', () => {
    expect(normalizeDigits('বাজার ১০০, dokan 200')).toBe('বাজার 100, dokan 200');
  });

  it('returns an empty string unchanged', () => {
    expect(normalizeDigits('')).toBe('');
  });
});
