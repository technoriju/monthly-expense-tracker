import mobileAds, {
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  type AdsConsentInfo,
} from 'react-native-google-mobile-ads';

import { useAdsStore } from '@/store/adsStore';

import { adsEnabled } from '../adConfig';

let inFlight: Promise<void> | null = null;

function applyConsentInfo(info: AdsConsentInfo): void {
  useAdsStore
    .getState()
    .setPrivacyOptionsRequired(
      info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
    );
}

async function run(): Promise<void> {
  const { setStatus } = useAdsStore.getState();
  if (!adsEnabled()) {
    setStatus('unavailable');
    return;
  }
  try {
    // Google UMP: refreshes consent info and shows the consent form only where required.
    const info = await AdsConsent.gatherConsent();
    applyConsentInfo(info);
    if (!info.canRequestAds) {
      setStatus('unavailable');
      return;
    }
    await mobileAds().initialize();
    setStatus('ready');
  } catch (error) {
    // Offline, consent form error or SDK failure: the app keeps working without ads.
    console.error('Ads initialisation failed', error);
    setStatus('unavailable');
  }
}

/** Runs consent + SDK initialisation once per session. Never throws. */
export function initializeAds(): Promise<void> {
  inFlight ??= run();
  return inFlight;
}

/** Shows Google's privacy options form so the user can change their ad consent. */
export async function showAdPrivacyOptions(): Promise<boolean> {
  try {
    applyConsentInfo(await AdsConsent.showPrivacyOptionsForm());
    return true;
  } catch (error) {
    console.error('Ad privacy options failed', error);
    return false;
  }
}

/** Test-only: forget the session's initialisation. */
export function resetAdsForTests(): void {
  inFlight = null;
}
