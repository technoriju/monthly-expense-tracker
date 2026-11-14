import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Linking from 'expo-linking';
import type { ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RootLayout from '@/app/_layout';
import { changeUiLanguage } from '@/i18n';
import { useSettingsStore } from '@/store/settingsStore';

import { OFFLINE_GRACE_MS } from '../constants';
import { parseUpdateConfig } from '../schema';

// The gate is off in development builds; these tests exercise the release behaviour.
jest.mock('../constants', () => ({
  ...jest.requireActual('../constants'),
  UPDATE_GATE_ENABLED: true,
}));

// In-memory settings table. Its contents survive "restarts" (re-renders) within a test.
jest.mock('@/database', () => {
  const store = new Map<string, unknown>();
  return {
    settingsRepository: {
      get: jest.fn(async (key: string) => store.get(key)),
      getAll: jest.fn(async () => Object.fromEntries(store)),
      set: jest.fn(async (key: string, value: unknown) => {
        store.set(key, value);
      }),
      reset: () => store.clear(),
    },
  };
});

jest.mock('@/hooks/useAppBootstrap', () => ({
  useAppBootstrap: () => ({ status: 'ready', retry: jest.fn() }),
}));

let mockInstalledVersion = '1.0.0';
jest.mock('@/features/settings/appInfo', () => ({
  getAppInfo: () => ({ version: mockInstalledVersion, buildVersion: null }),
}));

// Stands in for the whole route tree: if it renders, every screen and deep link is reachable.
jest.mock('expo-router', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  const Stack = () => <RNText testID="navigator">navigator</RNText>;
  Stack.Screen = function Screen() {
    return null;
  };
  Stack.Protected = function Protected({ children }: { children: ReactNode }) {
    return children;
  };
  return { Stack, router: { push: jest.fn(), back: jest.fn() } };
});

jest.mock('@/components/layout/Preloader', () => ({
  Preloader: () => {
    const { Text: RNText } = jest.requireActual('react-native');
    return <RNText testID="preloader">loading</RNText>;
  },
}));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(async () => true),
  hideAsync: jest.fn(async () => true),
}));
jest.mock('expo-system-ui', () => ({ setBackgroundColorAsync: jest.fn(async () => undefined) }));
jest.mock('expo-linking', () => ({ openURL: jest.fn(async () => true) }));
jest.mock('expo-application', () => ({ applicationId: 'com.rijukarar.expensetracker' }));
jest.mock(
  'lucide-react-native',
  () => new Proxy({}, { get: (_target, name) => (name === '__esModule' ? false : () => null) }),
);

const { settingsRepository } = jest.requireMock('@/database') as {
  settingsRepository: {
    set(key: string, value: unknown): Promise<void>;
    get(key: string): Promise<unknown>;
    reset(): void;
  };
};

const STORE_URL = 'https://apps.apple.com/app/id1';
const POLICY = {
  latestVersion: '1.2.0',
  minimumSupportedVersion: '1.1.0',
  forceUpdate: true,
  storeUrlAndroid: 'https://play.google.com/store/apps/details?id=x',
  storeUrlIOS: STORE_URL,
  releaseNotes: ['Improved receipt scanning', 'Fixed calculation bugs'],
};

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const fetchMock = jest.fn();
let appStateHandlers: ((state: AppStateStatus) => void)[] = [];

function serve(body: unknown) {
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => body });
}
function goOffline() {
  fetchMock.mockRejectedValue(new TypeError('Network request failed'));
}
async function cachePolicy(policy: unknown, checkedAt: number) {
  await settingsRepository.set('updatePolicyCache', {
    config: parseUpdateConfig(policy),
    checkedAt,
  });
}

/** Cold start: renders the root layout and lets the preloader, cache read and fetch settle. */
async function launch() {
  const view = await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <RootLayout />
    </SafeAreaProvider>,
  );
  await act(async () => {
    await jest.advanceTimersByTimeAsync(1500);
  });
  return view;
}

async function emitAppState(state: AppStateStatus) {
  await act(async () => {
    appStateHandlers.forEach((handler) => handler(state));
    await jest.advanceTimersByTimeAsync(10);
  });
}

beforeEach(async () => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  settingsRepository.reset();
  mockInstalledVersion = '1.0.0';
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  appStateHandlers = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    appStateHandlers.push(handler as (state: AppStateStatus) => void);
    return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
  });
  await changeUiLanguage('en');
  useSettingsStore
    .getState()
    .applySettings({ uiLanguage: 'en', appLockMethod: 'off', onboardingDone: true });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('mandatory update', () => {
  it('replaces the whole app with the update screen, without a way to dismiss it', async () => {
    serve(POLICY);
    await launch();

    expect(screen.getByTestId('mandatory-update-screen')).toBeTruthy();
    expect(screen.queryByTestId('navigator')).toBeNull();
    expect(screen.getByText('Update required')).toBeTruthy();
    expect(screen.getByText('Improved receipt scanning')).toBeTruthy();
    expect(screen.getByText('Installed: 1.0.0 · Latest: 1.2.0')).toBeTruthy();
    expect(screen.queryByText('Later')).toBeNull();
    expect(screen.queryByLabelText('Close')).toBeNull();
  });

  it('opens the store and re-checks on return; the new version gets in', async () => {
    serve(POLICY);
    await launch();
    await fireEvent.press(screen.getByTestId('update-now'));
    expect(Linking.openURL).toHaveBeenCalledWith(STORE_URL);

    // User comes back without installing: still blocked, but checked again.
    fetchMock.mockClear();
    await emitAppState('background');
    await emitAppState('active');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('mandatory-update-screen')).toBeTruthy();

    // After installing, the updated app starts normally.
    await screen.unmount();
    mockInstalledVersion = '1.2.0';
    await launch();
    expect(screen.getByTestId('navigator')).toBeTruthy();
    expect(screen.queryByTestId('mandatory-update-screen')).toBeNull();
  });

  it('shows a message when the store cannot be opened', async () => {
    serve({ ...POLICY, storeUrlIOS: 'APP_STORE_URL' });
    await launch();
    await fireEvent.press(screen.getByTestId('update-now'));
    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(screen.getByText(/Couldn't open the app store/)).toBeTruthy();
  });

  it('stays blocked after a restart while offline (cached policy)', async () => {
    serve(POLICY);
    await launch();
    await screen.unmount();

    goOffline();
    await launch();
    expect(screen.getByTestId('mandatory-update-screen')).toBeTruthy();
    expect(screen.queryByTestId('navigator')).toBeNull();
    expect(screen.getByText(/Check your internet connection/)).toBeTruthy();
  });

  it('Retry re-checks and lets the user in once the policy allows it', async () => {
    goOffline();
    await cachePolicy(POLICY, Date.now());
    await launch();
    expect(screen.getByTestId('mandatory-update-screen')).toBeTruthy();

    serve({ ...POLICY, minimumSupportedVersion: '1.0.0', latestVersion: '1.0.0' });
    await fireEvent.press(screen.getByTestId('update-retry'));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(10);
    });
    expect(screen.getByTestId('navigator')).toBeTruthy();
  });

  it('forceUpdate false only suggests the update', async () => {
    serve({ ...POLICY, forceUpdate: false });
    await launch();
    expect(screen.getByTestId('navigator')).toBeTruthy();
    expect(screen.getByTestId('optional-update-sheet')).toBeTruthy();
  });
});

describe('offline policy', () => {
  it('never blocks without any policy (first launch offline)', async () => {
    goOffline();
    await launch();
    expect(screen.getByTestId('navigator')).toBeTruthy();
    expect(screen.queryByTestId('mandatory-update-screen')).toBeNull();
  });

  it('stops blocking once the cached policy is older than the grace period', async () => {
    goOffline();
    await cachePolicy(POLICY, Date.now() - OFFLINE_GRACE_MS - 1);
    await launch();
    expect(screen.getByTestId('navigator')).toBeTruthy();
    expect(screen.getByTestId('optional-update-sheet')).toBeTruthy();
  });

  it('ignores an invalid remote file and keeps the app usable', async () => {
    serve({ latestVersion: 'soon' });
    await launch();
    expect(screen.getByTestId('navigator')).toBeTruthy();
  });
});

describe('optional update', () => {
  beforeEach(() => {
    mockInstalledVersion = '1.1.0';
  });

  it('lets the user continue, and "Later" holds until a newer version', async () => {
    serve(POLICY);
    await launch();
    expect(screen.getByTestId('navigator')).toBeTruthy();
    expect(screen.getByText('Update available')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('optional-update-later'));
    expect(screen.queryByTestId('optional-update-sheet')).toBeNull();
    await expect(settingsRepository.get('updateDismissedVersion')).resolves.toBe('1.2.0');

    // Restart: still dismissed for 1.2.0.
    await screen.unmount();
    await launch();
    expect(screen.queryByTestId('optional-update-sheet')).toBeNull();

    // A newer release prompts again.
    await screen.unmount();
    serve({ ...POLICY, latestVersion: '1.3.0' });
    await launch();
    expect(screen.getByTestId('optional-update-sheet')).toBeTruthy();
  });

  it('Update now opens the store', async () => {
    serve(POLICY);
    await launch();
    await fireEvent.press(screen.getByTestId('optional-update-now'));
    expect(Linking.openURL).toHaveBeenCalledWith(STORE_URL);
  });

  it('is not shown before onboarding is finished', async () => {
    useSettingsStore.getState().applySettings({ onboardingDone: false });
    serve(POLICY);
    await launch();
    expect(screen.queryByTestId('optional-update-sheet')).toBeNull();
  });

  it('is shown in Bengali', async () => {
    await changeUiLanguage('bn');
    useSettingsStore.getState().applySettings({ uiLanguage: 'bn' });
    serve(POLICY);
    await launch();
    expect(screen.getByText('আপডেট পাওয়া যাচ্ছে')).toBeTruthy();
  });
});

it('up-to-date versions see no update UI', async () => {
  mockInstalledVersion = '1.2.0';
  serve(POLICY);
  await launch();
  expect(screen.getByTestId('navigator')).toBeTruthy();
  expect(screen.queryByTestId('optional-update-sheet')).toBeNull();
  expect(screen.queryByTestId('mandatory-update-screen')).toBeNull();
});
