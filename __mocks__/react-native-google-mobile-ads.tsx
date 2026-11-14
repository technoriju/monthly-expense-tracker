/**
 * Jest stand-in for the native AdMob module (auto-applied for node_modules packages).
 * Tests drive banner callbacks through the props captured on the rendered `BannerAd`.
 */
import { View } from 'react-native';

export const TestIds = { ADAPTIVE_BANNER: 'test-adaptive-banner' };

export const BannerAdSize = { LARGE_ANCHORED_ADAPTIVE_BANNER: 'LARGE_ANCHORED_ADAPTIVE_BANNER' };

export const AdsConsentPrivacyOptionsRequirementStatus = {
  UNKNOWN: 'UNKNOWN',
  REQUIRED: 'REQUIRED',
  NOT_REQUIRED: 'NOT_REQUIRED',
};

export const AdsConsent = {
  gatherConsent: jest.fn(),
  showPrivacyOptionsForm: jest.fn(),
};

const initialize = jest.fn(() => Promise.resolve([]));
const mobileAds = jest.fn(() => ({ initialize }));
export default mobileAds;

export function BannerAd(props: {
  unitId: string;
  size: string;
  onAdLoaded?: () => void;
  onAdFailedToLoad?: (error: Error) => void;
}) {
  return <View testID="banner-ad" {...props} />;
}
