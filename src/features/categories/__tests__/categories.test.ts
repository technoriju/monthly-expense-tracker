import { SYSTEM_CATEGORIES } from '@/database/seed/systemCategories';
import { resources } from '@/i18n/resources';

import { CATEGORY_ICONS, CATEGORY_TONES } from '../categoryVisuals';
import { isCategoryKey } from '../categoryName';

// lucide ships ESM-only; each icon export is replaced by its name (only presence matters here).
jest.mock(
  'lucide-react-native',
  () =>
    new Proxy(
      { __esModule: true },
      { get: (target, name) => (name in target ? Reflect.get(target, name) : String(name)) },
    ),
);

describe('system categories', () => {
  it('have unique keys', () => {
    const keys = SYSTEM_CATEGORIES.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('include every requested default category', () => {
    const byType = (type: string) =>
      SYSTEM_CATEGORIES.filter((c) => c.type === type).map((c) => c.key);
    expect(byType('expense')).toEqual(
      expect.arrayContaining([
        'food',
        'transportation',
        'shopping',
        'bills',
        'entertainment',
        'healthcare',
        'education',
        'travel',
        'groceries',
        'personal_care',
        'rent',
        'other_expense',
        'bazar',
        'dokan',
      ]),
    );
    expect(byType('income')).toEqual([
      'salary',
      'freelance',
      'business',
      'investment',
      'gift',
      'other_income',
    ]);
  });

  it.each(SYSTEM_CATEGORIES.map((c) => [c.key, c] as const))(
    '%s has a known icon, tone and a translation in en/bn/hi',
    (key, category) => {
      expect(CATEGORY_ICONS[category.icon]).toBeDefined();
      expect(Object.keys(CATEGORY_TONES)).toContain(category.color);
      expect(isCategoryKey(key)).toBe(true);
      for (const lang of ['en', 'bn', 'hi'] as const) {
        const name = (resources[lang]?.categories as Record<string, string>)[key];
        expect(name?.trim()).toBeTruthy();
      }
    },
  );
});
