import { adsEnabled, getBannerUnitId } from '../adConfig';

describe('adsEnabled', () => {
  it('is on for Android unless explicitly disabled', () => {
    expect(adsEnabled('android', undefined)).toBe(true);
    expect(adsEnabled('android', '1')).toBe(true);
    expect(adsEnabled('android', '0')).toBe(false);
  });

  it('is off on iOS for this release', () => {
    expect(adsEnabled('ios', undefined)).toBe(false);
  });
});

describe('getBannerUnitId', () => {
  const live = 'ca-app-pub-1111111111111111/2222222222';

  it('always uses the test unit in development', () => {
    expect(getBannerUnitId(true, live)).toBe('test-adaptive-banner');
  });

  it('uses the configured unit in release builds', () => {
    expect(getBannerUnitId(false, live)).toBe(live);
  });

  it('falls back to the test unit when none is configured', () => {
    expect(getBannerUnitId(false, undefined)).toBe('test-adaptive-banner');
    expect(getBannerUnitId(false, '  ')).toBe('test-adaptive-banner');
  });
});
