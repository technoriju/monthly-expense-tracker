import { compareVersions, parseVersion } from '../version';

describe('compareVersions', () => {
  it.each([
    ['1.0.0', '1.0.0', 0],
    ['1.0.0', '1.0.1', -1],
    ['1.0.1', '1.1.0', -1],
    ['1.1.0', '1.10.0', -1],
    ['1.9.0', '1.10.0', -1],
    ['1.10.0', '2.0.0', -1],
    ['2.0.0', '1.10.0', 1],
    ['1.2.0', '1.1.9', 1],
    ['1.0', '1.0.0', 0],
    ['1', '1.0.0', 0],
    ['v1.2.0', '1.2.0', 0],
    ['1.2.0-beta.1', '1.2.0', 0],
  ] as const)('%s vs %s → %d', (a, b, expected) => {
    expect(compareVersions(a, b)).toBe(expected);
  });

  it('is numeric, not alphabetical', () => {
    expect('1.10.0' < '1.9.0').toBe(true); // what string comparison would say
    expect(compareVersions('1.10.0', '1.9.0')).toBe(1);
  });

  it.each(['', 'abc', '1.x.0', '1.0.0.0', '1..0', '—', ' '])('rejects %p', (bad) => {
    expect(parseVersion(bad)).toBeNull();
    expect(compareVersions(bad, '1.0.0')).toBeNull();
  });
});
