import mobileAds, { AdsConsent } from 'react-native-google-mobile-ads';

import { useAdsStore } from '@/store/adsStore';

import { initializeAds, resetAdsForTests, showAdPrivacyOptions } from '../services/adsService';

// jest-expo runs as iOS; ads are Android-only, so force them on for these tests.
jest.mock('../adConfig', () => ({
  ...jest.requireActual<typeof import('../adConfig')>('../adConfig'),
  adsEnabled: () => true,
}));

const gatherConsent = AdsConsent.gatherConsent as jest.Mock;
const showPrivacyOptionsForm = AdsConsent.showPrivacyOptionsForm as jest.Mock;
const initialize = (mobileAds as unknown as jest.Mock)().initialize as jest.Mock;

function consent(canRequestAds: boolean, privacy = 'NOT_REQUIRED') {
  return { canRequestAds, privacyOptionsRequirementStatus: privacy };
}

beforeEach(() => {
  jest.clearAllMocks();
  resetAdsForTests();
  useAdsStore.setState({ status: 'pending', privacyOptionsRequired: false });
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('initializeAds', () => {
  it('initialises the SDK after consent allows ads', async () => {
    gatherConsent.mockResolvedValue(consent(true, 'REQUIRED'));
    await initializeAds();
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(useAdsStore.getState()).toMatchObject({ status: 'ready', privacyOptionsRequired: true });
  });

  it('does not initialise when ads may not be requested', async () => {
    gatherConsent.mockResolvedValue(consent(false));
    await initializeAds();
    expect(initialize).not.toHaveBeenCalled();
    expect(useAdsStore.getState().status).toBe('unavailable');
  });

  it('never throws when consent fails (e.g. offline)', async () => {
    gatherConsent.mockRejectedValue(new Error('network'));
    await expect(initializeAds()).resolves.toBeUndefined();
    expect(initialize).not.toHaveBeenCalled();
    expect(useAdsStore.getState().status).toBe('unavailable');
  });

  it('never throws when SDK initialisation fails', async () => {
    gatherConsent.mockResolvedValue(consent(true));
    initialize.mockRejectedValueOnce(new Error('sdk'));
    await expect(initializeAds()).resolves.toBeUndefined();
    expect(useAdsStore.getState().status).toBe('unavailable');
  });

  it('runs only once per session', async () => {
    gatherConsent.mockResolvedValue(consent(true));
    await Promise.all([initializeAds(), initializeAds()]);
    await initializeAds();
    expect(gatherConsent).toHaveBeenCalledTimes(1);
  });
});

describe('showAdPrivacyOptions', () => {
  it('updates the requirement flag from the form result', async () => {
    showPrivacyOptionsForm.mockResolvedValue(consent(true, 'NOT_REQUIRED'));
    useAdsStore.setState({ privacyOptionsRequired: true });
    await expect(showAdPrivacyOptions()).resolves.toBe(true);
    expect(useAdsStore.getState().privacyOptionsRequired).toBe(false);
  });

  it('reports failure without throwing', async () => {
    showPrivacyOptionsForm.mockRejectedValue(new Error('form'));
    await expect(showAdPrivacyOptions()).resolves.toBe(false);
  });
});
