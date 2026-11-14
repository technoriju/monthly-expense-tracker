import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

/**
 * Ads ship on Android only for now (iOS needs an ATT + privacy-manifest review first) and can
 * be compiled out with EXPO_PUBLIC_ADS_ENABLED=0. See docs/ADMOB_SETUP.md.
 */
export function adsEnabled(
  os: string = Platform.OS,
  flag: string | undefined = process.env.EXPO_PUBLIC_ADS_ENABLED,
): boolean {
  return os === 'android' && flag !== '0';
}

/**
 * Development builds always use Google's test unit, so live ads are never requested while
 * testing. Release builds use the configured unit, or the test unit when none is set.
 */
export function getBannerUnitId(
  isDev: boolean = __DEV__,
  configured: string | undefined = process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID,
): string {
  const unitId = configured?.trim();
  return isDev || !unitId ? TestIds.ADAPTIVE_BANNER : unitId;
}
