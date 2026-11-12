import { getCategoryName } from '../categoryName';
import { splitQuickCategories } from '../quickCategories';
import type { Category } from '../types';

function category(id: number, key: string, customName: string | null = null): Category {
  return {
    id,
    key,
    type: 'expense',
    icon: 'Tag',
    color: 'primary',
    sortOrder: id,
    isDefault: customName === null,
    customName,
    createdAt: 0,
  };
}

describe('splitQuickCategories', () => {
  it('keeps the first 6 non-Other categories in order and returns Other separately', () => {
    const list = [
      category(1, 'rent'),
      category(2, 'other_expense'),
      ...['food', 'bills', 'travel', 'shopping', 'bazar', 'dokan'].map((k, i) =>
        category(10 + i, k),
      ),
    ];
    const { quick, other } = splitQuickCategories(list, 'expense');
    expect(quick.map((c) => c.key)).toEqual([
      'rent',
      'food',
      'bills',
      'travel',
      'shopping',
      'bazar',
    ]);
    expect(other?.key).toBe('other_expense');
  });

  it('returns fewer tiles when there are fewer categories', () => {
    const { quick, other } = splitQuickCategories([category(1, 'salary')], 'income');
    expect(quick).toHaveLength(1);
    expect(other).toBeNull();
  });
});

describe('getCategoryName', () => {
  const t = ((key: string) => `t:${key}`) as unknown as Parameters<typeof getCategoryName>[0];

  it('uses the custom name for user categories and i18n for system ones', () => {
    expect(getCategoryName(t, category(1, 'custom_x', 'Pets'))).toBe('Pets');
    expect(getCategoryName(t, category(2, 'food'))).toBe('t:food');
  });
});
