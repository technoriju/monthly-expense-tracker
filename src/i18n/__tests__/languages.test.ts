import {
  getSelectableLanguages,
  isSelectableLanguage,
  LANGUAGES,
  resolveInitialLanguage,
} from '../languages';
import { englishResources, resources } from '../resources';

function flattenKeys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? flattenKeys(value as object, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

function flattenEntries(obj: object, prefix = ''): [string, unknown][] {
  return Object.entries(obj).flatMap(([key, value]): [string, unknown][] =>
    typeof value === 'object' && value !== null
      ? flattenEntries(value as object, `${prefix}${key}.`)
      : [[`${prefix}${key}`, value]],
  );
}

function flattenValues(obj: object): unknown[] {
  return Object.values(obj).flatMap((v) =>
    typeof v === 'object' && v !== null ? flattenValues(v as object) : [v],
  );
}

describe('language registry', () => {
  it('lists English + 22 scheduled Indian languages with unique codes', () => {
    expect(LANGUAGES).toHaveLength(23);
    expect(new Set(LANGUAGES.map((l) => l.code)).size).toBe(23);
  });

  it('ships en, bn, hi as selectable and the rest as planned', () => {
    expect(getSelectableLanguages().map((l) => l.code)).toEqual(['en', 'bn', 'hi']);
    expect(isSelectableLanguage('ta')).toBe(false);
  });

  it('marks Perso-Arabic languages as RTL', () => {
    const rtl = LANGUAGES.filter((l) => l.direction === 'rtl').map((l) => l.code);
    expect(rtl.sort()).toEqual(['ks', 'sd', 'ur']);
  });

  it('has translation resources for exactly the selectable languages', () => {
    expect(Object.keys(resources).sort()).toEqual(['bn', 'en', 'hi']);
  });
});

describe('translation resources', () => {
  const englishKeys = flattenKeys(englishResources).sort();

  it.each(['bn', 'hi'] as const)('%s has the same keys as English', (code) => {
    expect(flattenKeys(resources[code] ?? {}).sort()).toEqual(englishKeys);
  });

  it.each(['bn', 'hi'] as const)('%s uses the same {{placeholders}} as English', (code) => {
    const placeholders = (obj: object) =>
      Object.fromEntries(
        flattenEntries(obj).map(([key, value]) => [
          key,
          [...String(value).matchAll(/{{\s*(\w+)/g)].map((m) => m[1]).sort(),
        ]),
      );
    expect(placeholders(resources[code] ?? {})).toEqual(placeholders(englishResources));
  });

  it.each(['en', 'bn', 'hi'] as const)('%s has no empty strings', (code) => {
    for (const value of flattenValues(resources[code] ?? {})) {
      expect(typeof value).toBe('string');
      expect((value as string).trim()).not.toBe('');
    }
  });
});

describe('resolveInitialLanguage', () => {
  it('prefers a valid saved language', () => {
    expect(resolveInitialLanguage('bn', ['hi'])).toBe('bn');
  });

  it('ignores saved languages that are unknown or not yet available', () => {
    expect(resolveInitialLanguage('ta', ['hi'])).toBe('hi');
    expect(resolveInitialLanguage(42, [null, 'HI'])).toBe('hi');
  });

  it('falls back to English', () => {
    expect(resolveInitialLanguage(undefined, ['fr', null])).toBe('en');
  });
});
