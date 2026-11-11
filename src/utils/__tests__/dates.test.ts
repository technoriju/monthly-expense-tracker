import { formatMonthYear, getGreetingKey, getRelativeDayKey, toIsoDate } from '../dates';

describe('dates', () => {
  it('formats local calendar dates as YYYY-MM-DD', () => {
    expect(toIsoDate(new Date(2025, 4, 2, 23, 59))).toBe('2025-05-02');
  });

  it.each([
    [4, 'evening'],
    [5, 'morning'],
    [11, 'morning'],
    [12, 'afternoon'],
    [16, 'afternoon'],
    [17, 'evening'],
  ] as const)('greets hour %i with %s', (hour, key) => {
    expect(getGreetingKey(new Date(2025, 4, 22, hour))).toBe(key);
  });

  it('returns today / yesterday / null relative day keys', () => {
    const today = new Date(2025, 4, 22, 10);
    expect(getRelativeDayKey('2025-05-22', today)).toBe('today');
    expect(getRelativeDayKey('2025-05-21', today)).toBe('yesterday');
    expect(getRelativeDayKey('2025-05-10', today)).toBeNull();
  });

  it('formats month names per language', () => {
    const may = new Date(2025, 4, 1);
    expect(formatMonthYear(may, 'en', 'en-IN')).toBe('May 2025');
    expect(formatMonthYear(may, 'bn', 'bn-IN')).toContain('মে');
    expect(formatMonthYear(may, 'hi', 'hi-IN')).toContain('मई');
  });
});
