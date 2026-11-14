import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Extends app.json. Only the AdMob plugin lives here, because its App IDs come from the
 * environment (EAS environment variables or a local .env file) instead of being committed.
 * Without real IDs the build uses Google's public sample App IDs, which only serve test ads.
 * See docs/ADMOB_SETUP.md.
 */
const TEST_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const TEST_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';

export default ({ config }: ConfigContext): ExpoConfig => {
  const androidAppId = process.env.ADMOB_ANDROID_APP_ID?.trim() || undefined;
  const iosAppId = process.env.ADMOB_IOS_APP_ID?.trim() || undefined;

  // A store build must never ship with the sample App ID (it can only show test ads).
  if (process.env.EAS_BUILD_PROFILE === 'production' && !androidAppId) {
    throw new Error(
      'ADMOB_ANDROID_APP_ID is not set for the production build. See docs/ADMOB_SETUP.md.',
    );
  }

  return {
    ...(config as ExpoConfig),
    plugins: [
      ...(config.plugins ?? []),
      [
        'react-native-google-mobile-ads',
        {
          androidAppId: androidAppId ?? TEST_ANDROID_APP_ID,
          iosAppId: iosAppId ?? TEST_IOS_APP_ID,
          // No measurement data is sent before the consent flow has run and ads initialise.
          delayAppMeasurementInit: true,
        },
      ],
    ],
  };
};
