import { parseUpdateConfig, pickLocalized } from '../schema';

/** The file as currently published (store URLs still placeholders). */
const LIVE = {
  latestVersion: '1.2.0',
  minimumSupportedVersion: '1.1.0',
  forceUpdate: true,
  storeUrlAndroid: 'PLAY_STORE_URL',
  storeUrlIOS: 'APP_STORE_URL',
  releaseNotes: ['Improved receipt scanning', 'Fixed calculation bugs', 'Improved performance'],
};

describe('parseUpdateConfig', () => {
  it('accepts the published file and drops placeholder store URLs', () => {
    const config = parseUpdateConfig(LIVE);
    expect(config).toMatchObject({
      latestVersion: '1.2.0',
      minimumSupportedVersion: '1.1.0',
      forceUpdate: true,
      releaseNotes: { default: LIVE.releaseNotes },
    });
    expect(config?.storeUrlAndroid).toBeUndefined();
    expect(config?.storeUrlIOS).toBeUndefined();
  });

  it('keeps real store links and optional fields', () => {
    const config = parseUpdateConfig({
      ...LIVE,
      storeUrlAndroid: 'https://play.google.com/store/apps/details?id=com.example',
      storeUrlIOS: 'itms-apps://apps.apple.com/app/id123',
      message: { en: 'Please update', bn: 'আপডেট করুন' },
      updatedAt: '2026-11-14T10:00:00Z',
    });
    expect(config?.storeUrlAndroid).toContain('play.google.com');
    expect(config?.storeUrlIOS).toContain('itms-apps://');
    expect(pickLocalized(config?.message, 'bn')).toBe('আপডেট করুন');
    expect(config?.updatedAt).toBe('2026-11-14T10:00:00Z');
  });

  it('rejects unsafe link schemes without rejecting the file', () => {
    const config = parseUpdateConfig({ ...LIVE, storeUrlAndroid: 'javascript:alert(1)' });
    expect(config).not.toBeNull();
    expect(config?.storeUrlAndroid).toBeUndefined();
    expect(
      parseUpdateConfig({ ...LIVE, storeUrlIOS: 'http://x.com' })?.storeUrlIOS,
    ).toBeUndefined();
  });

  it('supports per-language release notes with fallback', () => {
    const config = parseUpdateConfig({
      ...LIVE,
      releaseNotes: { en: ['Faster'], bn: ['দ্রুত'] },
    });
    expect(pickLocalized(config?.releaseNotes, 'bn')).toEqual(['দ্রুত']);
    expect(pickLocalized(config?.releaseNotes, 'hi')).toEqual(['Faster']);
    expect(pickLocalized(parseUpdateConfig(LIVE)?.releaseNotes, 'bn')).toEqual(LIVE.releaseNotes);
  });

  it('tolerates malformed optional fields and unknown keys', () => {
    const config = parseUpdateConfig({
      latestVersion: '1.2.0',
      minimumSupportedVersion: '1.0.0',
      forceUpdate: 'yes',
      releaseNotes: 42,
      newField: { anything: true },
    });
    expect(config).toEqual({ latestVersion: '1.2.0', minimumSupportedVersion: '1.0.0' });
  });

  it('caps release notes', () => {
    const notes = Array.from({ length: 30 }, (_, i) => `${'x'.repeat(300)}${i}`);
    const list = parseUpdateConfig({ ...LIVE, releaseNotes: [...notes, '', 7] })?.releaseNotes
      ?.default;
    expect(list).toHaveLength(10);
    expect(list?.[0]).toHaveLength(200);
  });

  it.each([
    null,
    'text',
    [],
    {},
    { latestVersion: '1.2.0' },
    { latestVersion: '1.2', minimumSupportedVersion: 'latest' },
    { latestVersion: 120, minimumSupportedVersion: '1.0.0' },
  ])('rejects invalid config %p', (raw) => {
    expect(parseUpdateConfig(raw)).toBeNull();
  });
});
