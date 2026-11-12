import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { settingsRepository } from '@/database';
import { appLockService } from '@/features/security/services/appLockService';
import { changeUiLanguage } from '@/i18n';
import { useSettingsStore } from '@/store/settingsStore';

import { OnboardingView } from '../components/OnboardingView';
import { ONBOARDING_SLIDES } from '../slides';

jest.mock('@/database', () => ({
  settingsRepository: { set: jest.fn(async () => undefined) },
}));

// lucide ships ESM only; icons are irrelevant to these tests.
jest.mock(
  'lucide-react-native',
  () => new Proxy({}, { get: (_target, name) => (name === '__esModule' ? false : () => null) }),
);

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

jest.mock('@/features/security/services/appLockService', () => ({
  appLockService: { getCapabilities: jest.fn(), authenticate: jest.fn() },
}));

const NO_LOCK = { hasSecurity: false, hasBiometrics: false, biometricKind: 'other' } as const;
const FINGERPRINT = {
  hasSecurity: true,
  hasBiometrics: true,
  biometricKind: 'fingerprint',
} as const;

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

async function renderOnboarding(): Promise<void> {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <OnboardingView />
    </SafeAreaProvider>,
  );
  await fireEvent(screen.getByTestId('onboarding-pager'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 350, height: 600 } },
  });
}

beforeEach(async () => {
  await changeUiLanguage('en');
  useSettingsStore
    .getState()
    .applySettings({ uiLanguage: 'en', onboardingDone: false, appLockMethod: 'off' });
  jest.mocked(settingsRepository.set).mockClear();
  jest.mocked(appLockService.getCapabilities).mockResolvedValue(NO_LOCK);
  jest.mocked(appLockService.authenticate).mockReset();
});

describe('OnboardingView', () => {
  it('walks through every slide with Next and finishes on Get Started', async () => {
    await renderOnboarding();
    expect(screen.getByText('Welcome to Expense Tracker')).toBeTruthy();
    expect(screen.getByLabelText(`Step 1 of ${ONBOARDING_SLIDES.length}`)).toBeTruthy();

    for (let i = 1; i < ONBOARDING_SLIDES.length; i++) {
      await fireEvent.press(screen.getByText('Next'));
    }
    expect(
      screen.getByLabelText(`Step ${ONBOARDING_SLIDES.length} of ${ONBOARDING_SLIDES.length}`),
    ).toBeTruthy();
    expect(screen.queryByText('Skip')).toBeNull();
    expect(useSettingsStore.getState().onboardingDone).toBe(false);

    await fireEvent.press(screen.getByText('Get Started'));
    await screen.findByTestId('onboarding-next');
    expect(settingsRepository.set).toHaveBeenCalledWith('onboardingDone', true);
    expect(useSettingsStore.getState().onboardingDone).toBe(true);
  });

  it('Skip completes onboarding immediately', async () => {
    await renderOnboarding();
    await fireEvent.press(screen.getByText('Skip'));
    await screen.findByTestId('onboarding-next');
    expect(settingsRepository.set).toHaveBeenCalledWith('onboardingDone', true);
    expect(useSettingsStore.getState().onboardingDone).toBe(true);
  });

  it('opens the language picker from the top bar', async () => {
    await renderOnboarding();
    await fireEvent.press(screen.getByLabelText('Language'));
    expect(router.push).toHaveBeenCalledWith('/settings/language');
  });

  it('renders in Bengali', async () => {
    await changeUiLanguage('bn');
    useSettingsStore.getState().applySettings({ uiLanguage: 'bn' });
    await renderOnboarding();
    expect(screen.getByText('খরচের হিসাবে স্বাগতম')).toBeTruthy();
    expect(screen.getByText('পরবর্তী')).toBeTruthy();
  });
});

describe('OnboardingView app-lock step', () => {
  beforeEach(() => {
    jest.mocked(appLockService.getCapabilities).mockResolvedValue(FINGERPRINT);
  });

  it('offers the app lock after Skip; Not now finishes without a lock', async () => {
    await renderOnboarding();
    await fireEvent.press(screen.getByText('Skip'));
    expect(await screen.findByText('Secure Your App')).toBeTruthy();
    expect(useSettingsStore.getState().onboardingDone).toBe(false);

    await fireEvent.press(screen.getByText('Not now'));
    expect(settingsRepository.set).toHaveBeenCalledWith('onboardingDone', true);
    expect(settingsRepository.set).not.toHaveBeenCalledWith('appLockMethod', expect.anything());
    expect(useSettingsStore.getState().appLockMethod).toBe('off');
  });

  it('turns on the chosen lock after the user verifies, then finishes', async () => {
    jest.mocked(appLockService.authenticate).mockResolvedValue('success');
    await renderOnboarding();
    await fireEvent.press(screen.getByText('Skip'));
    await fireEvent.press(await screen.findByText('Use Fingerprint'));

    expect(appLockService.authenticate).toHaveBeenCalledTimes(1);
    expect(settingsRepository.set).toHaveBeenCalledWith('appLockMethod', 'biometric');
    expect(useSettingsStore.getState().appLockMethod).toBe('biometric');
    expect(useSettingsStore.getState().onboardingDone).toBe(true);
  });

  it('stays on the step when verification is cancelled', async () => {
    jest.mocked(appLockService.authenticate).mockResolvedValue('cancelled');
    await renderOnboarding();
    await fireEvent.press(screen.getByText('Skip'));
    await fireEvent.press(await screen.findByText('Use Phone screen lock'));

    expect(screen.getByText('Secure Your App')).toBeTruthy();
    expect(useSettingsStore.getState().appLockMethod).toBe('off');
    expect(useSettingsStore.getState().onboardingDone).toBe(false);
  });
});
