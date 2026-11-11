import {
  activePreset,
  eachDay,
  isAtOrAfterToday,
  presetPeriod,
  previousRange,
  rangeLength,
  resolveRange,
  shiftPeriod,
  validateCustomRange,
} from '../period';

const TODAY = new Date(2025, 4, 22); // 22 May 2025

describe('report periods', () => {
  it('resolves presets relative to today', () => {
    expect(resolveRange(presetPeriod('thisMonth', TODAY))).toEqual({
      from: '2025-05-01',
      to: '2025-05-31',
    });
    expect(resolveRange(presetPeriod('lastMonth', TODAY))).toEqual({
      from: '2025-04-01',
      to: '2025-04-30',
    });
    expect(resolveRange(presetPeriod('thisYear', TODAY))).toEqual({
      from: '2025-01-01',
      to: '2025-12-31',
    });
  });

  it('crosses the year boundary for last month in January', () => {
    expect(resolveRange(presetPeriod('lastMonth', new Date(2025, 0, 10)))).toEqual({
      from: '2024-12-01',
      to: '2024-12-31',
    });
  });

  it('knows which preset is active', () => {
    expect(activePreset(presetPeriod('thisMonth', TODAY), TODAY)).toBe('thisMonth');
    expect(activePreset(presetPeriod('lastMonth', TODAY), TODAY)).toBe('lastMonth');
    expect(activePreset({ kind: 'month', month: '2024-01-01' }, TODAY)).toBeNull();
    expect(activePreset({ kind: 'year', year: 2025 }, TODAY)).toBe('thisYear');
    expect(activePreset({ kind: 'custom', from: '2025-01-01', to: '2025-01-02' }, TODAY)).toBe(
      'custom',
    );
  });

  it('gives the previous month, previous year, or an equally long previous range', () => {
    expect(previousRange({ kind: 'month', month: '2025-03-01' })).toEqual({
      from: '2025-02-01',
      to: '2025-02-28',
    });
    expect(previousRange({ kind: 'year', year: 2025 })).toEqual({
      from: '2024-01-01',
      to: '2024-12-31',
    });
    expect(previousRange({ kind: 'custom', from: '2025-05-11', to: '2025-05-20' })).toEqual({
      from: '2025-05-01',
      to: '2025-05-10',
    });
  });

  it('steps months and years but not custom ranges', () => {
    expect(shiftPeriod({ kind: 'month', month: '2025-12-01' }, 1)).toEqual({
      kind: 'month',
      month: '2026-01-01',
    });
    expect(shiftPeriod({ kind: 'year', year: 2025 }, -1)).toEqual({ kind: 'year', year: 2024 });
    const custom = { kind: 'custom', from: '2025-01-01', to: '2025-01-31' } as const;
    expect(shiftPeriod(custom, 1)).toBe(custom);
  });

  it('blocks stepping past the period containing today', () => {
    expect(isAtOrAfterToday({ kind: 'month', month: '2025-05-01' }, TODAY)).toBe(true);
    expect(isAtOrAfterToday({ kind: 'month', month: '2025-04-01' }, TODAY)).toBe(false);
  });

  it('counts and lists days inclusively', () => {
    expect(rangeLength({ from: '2024-02-01', to: '2024-02-29' })).toBe(29);
    expect(eachDay({ from: '2025-05-30', to: '2025-06-02' })).toEqual([
      '2025-05-30',
      '2025-05-31',
      '2025-06-01',
      '2025-06-02',
    ]);
  });
});

describe('validateCustomRange', () => {
  it('accepts a valid range, including a single day', () => {
    expect(validateCustomRange('2025-05-01', '2025-05-31')).toBeNull();
    expect(validateCustomRange('2025-05-01', '2025-05-01')).toBeNull();
  });

  it('rejects missing, invalid and reversed ranges', () => {
    expect(validateCustomRange(null, '2025-05-01')).toBe('missing');
    expect(validateCustomRange('2025-05-01', null)).toBe('missing');
    expect(validateCustomRange('2025-02-30', '2025-03-01')).toBe('invalidDate');
    expect(validateCustomRange('2025-05-31', '2025-05-01')).toBe('endBeforeStart');
  });
});
