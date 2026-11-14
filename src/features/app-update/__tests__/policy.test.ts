import { OFFLINE_GRACE_MS } from '../constants';
import { decideUpdate, type DecideInput } from '../policy';
import { parseUpdateConfig, type UpdateConfig } from '../schema';

const NOW = 1_800_000_000_000;

function config(overrides: Record<string, unknown> = {}): UpdateConfig {
  const parsed = parseUpdateConfig({
    latestVersion: '1.2.0',
    minimumSupportedVersion: '1.1.0',
    forceUpdate: true,
    ...overrides,
  });
  if (!parsed) throw new Error('bad fixture');
  return parsed;
}

function decide(installedVersion: string, input: Partial<DecideInput> = {}) {
  return decideUpdate({
    installedVersion,
    config: config(),
    source: 'fresh',
    checkedAt: NOW,
    now: NOW,
    dismissedVersion: null,
    ...input,
  }).status;
}

describe('decideUpdate', () => {
  it('A: equal to or above latest → up to date', () => {
    expect(decide('1.2.0')).toBe('upToDate');
    expect(decide('1.3.0')).toBe('upToDate');
    expect(decide('1.10.0')).toBe('upToDate');
  });

  it('B: below latest but supported → optional', () => {
    expect(decide('1.1.0')).toBe('optional');
    expect(decide('1.1.9')).toBe('optional');
  });

  it('B: hidden once "Later" was chosen for that latest version', () => {
    expect(decide('1.1.0', { dismissedVersion: '1.2.0' })).toBe('upToDate');
    expect(decide('1.1.0', { dismissedVersion: '1.1.5' })).toBe('optional');
  });

  it('C: below minimum → mandatory, and "Later" cannot skip it', () => {
    expect(decide('1.0.0')).toBe('mandatory');
    expect(decide('1.0.9', { dismissedVersion: '1.2.0' })).toBe('mandatory');
  });

  it('C: forceUpdate false softens a mandatory update to optional', () => {
    expect(decide('1.0.0', { config: config({ forceUpdate: false }) })).toBe('optional');
    // forceUpdate never forces supported versions.
    expect(decide('1.1.0', { config: config({ forceUpdate: true }) })).toBe('optional');
  });

  it('C: missing forceUpdate keeps the minimum enforced (backward compatible)', () => {
    expect(decide('1.0.0', { config: config({ forceUpdate: undefined }) })).toBe('mandatory');
  });

  it('D: cached policy blocks within the offline grace period only', () => {
    const cache = { source: 'cache' as const };
    expect(decide('1.0.0', { ...cache, checkedAt: NOW - OFFLINE_GRACE_MS })).toBe('mandatory');
    expect(decide('1.0.0', { ...cache, checkedAt: NOW - OFFLINE_GRACE_MS - 1 })).toBe('optional');
    expect(decide('1.1.0', { ...cache, checkedAt: NOW - OFFLINE_GRACE_MS * 3 })).toBe('optional');
  });

  it('D: no policy → unknown, never blocked', () => {
    expect(decide('1.0.0', { config: null, source: 'none', checkedAt: null })).toBe('unknown');
  });

  it('never blocks on a version it cannot read', () => {
    expect(decide('—')).toBe('unknown');
  });

  it('a minimum above latest still blocks older versions', () => {
    const odd = config({ latestVersion: '1.0.0', minimumSupportedVersion: '2.0.0' });
    expect(decide('1.0.0', { config: odd })).toBe('mandatory');
  });
});
