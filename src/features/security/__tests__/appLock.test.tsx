import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { AppState, type AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { settingsRepository } from '@/database';
import { settingsService } from '@/features/settings/services/settingsService';
import { changeUiLanguage } from '@/i18n';
import { useSettingsStore } from '@/store/settingsStore';

import { AppLockSettingsView } from '../components/AppLockSettingsView';
import { LockScreen } from '../components/LockScreen';
import { useAppLock } from '../hooks/useAppLock';
import { appLockService } from '../services/appLockService';
import { RELOCK_AFTER_MS } from '../types';

jest.mock('@/database', () => {
  const store = new Map<string, unknown>();
  return {
    settingsRepository: {
      getAll: jest.fn(async () => Object.fromEntries(store)),
      set: jest.fn(async (key: string, value: unknown) => {
        store.set(key, value);
      }),
      reset: () => store.clear(),
    },
  };
});

jest.mock('expo-local-authentication', () => ({
  SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 },
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
  getEnrolledLevelAsync: jest.fn(),
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  supportedAuthenticationTypesAsync: jest.fn(),
  authenticateAsync: jest.fn(),
}));

// lucide ships ESM only; icons are irrelevant to these tests.
jest.mock(
  'lucide-react-native',
  () => new Proxy({}, { get: (_target, name) => (name === '__esModule' ? false : () => null) }),
);

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

const LA = jest.mocked(LocalAuthentication);

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function phoneWith({ level, biometrics }: { level: number; biometrics: boolean }) {
  LA.getEnrolledLevelAsync.mockResolvedValue(level);
  LA.hasHardwareAsync.mockResolvedValue(biometrics);
  LA.isEnrolledAsync.mockResolvedValue(biometrics);
  LA.supportedAuthenticationTypesAsync.mockResolvedValue(
    biometrics ? [LocalAuthentication.AuthenticationType.FINGERPRINT] : [],
  );
}

beforeEach(async () => {
  jest.clearAllMocks();
  (settingsRepository as unknown as { reset(): void }).reset();
  await changeUiLanguage('en');
  useSettingsStore.getState().applySettings({ uiLanguage: 'en', appLockMethod: 'off' });
  phoneWith({ level: 3, biometrics: true });
});

describe('appLockService', () => {
  it('reports what the phone supports', async () => {
    await expect(appLockService.getCapabilities()).resolves.toEqual({
      hasSecurity: true,
      hasBiometrics: true,
      biometricKind: 'fingerprint',
    });
    phoneWith({ level: 0, biometrics: false });
    await expect(appLockService.getCapabilities()).resolves.toEqual({
      hasSecurity: false,
      hasBiometrics: false,
      biometricKind: 'other',
    });
  });

  it.each([
    [{ success: true }, 'success'],
    [{ success: false, error: 'user_cancel' }, 'cancelled'],
    [{ success: false, error: 'system_cancel' }, 'cancelled'],
    [{ success: false, error: 'lockout' }, 'failed'],
  ] as const)('maps %j to %s and allows the PIN fallback', async (result, expected) => {
    LA.authenticateAsync.mockResolvedValue(result);
    await expect(appLockService.authenticate('Unlock', 'Cancel')).resolves.toBe(expected);
    expect(LA.authenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ disableDeviceFallback: false }),
    );
  });

  it('treats a thrown error as a failure', async () => {
    LA.authenticateAsync.mockRejectedValue(new Error('boom'));
    await expect(appLockService.authenticate('Unlock', 'Cancel')).resolves.toBe('failed');
  });
});

describe('settingsService app lock', () => {
  it('defaults to off and ignores invalid stored values', async () => {
    await settingsService.hydrate(['en']);
    expect(useSettingsStore.getState().appLockMethod).toBe('off');
    await settingsRepository.set('appLockMethod', 'face-pin');
    await settingsService.hydrate(['en']);
    expect(useSettingsStore.getState().appLockMethod).toBe('off');
  });

  it('persists the method and restores it on the next start', async () => {
    await settingsService.setAppLockMethod('device');
    expect(settingsRepository.set).toHaveBeenCalledWith('appLockMethod', 'device');
    useSettingsStore.getState().applySettings({ appLockMethod: 'off' });
    await settingsService.hydrate(['en']);
    expect(useSettingsStore.getState().appLockMethod).toBe('device');
  });

  it('rejects unknown methods', async () => {
    await expect(settingsService.setAppLockMethod('pin' as unknown as 'device')).rejects.toThrow();
  });
});

describe('useAppLock', () => {
  let emitAppState: (state: AppStateStatus) => void = () => undefined;
  let now = 0;

  beforeEach(() => {
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      emitAppState = handler as (state: AppStateStatus) => void;
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
    now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stays unlocked when the lock is off', async () => {
    const { result } = await renderHook(() => useAppLock(true));
    expect(result.current.locked).toBe(false);
  });

  it('locks at startup once ready, and unlocks after a successful prompt', async () => {
    useSettingsStore.getState().applySettings({ appLockMethod: 'biometric' });
    const { result, rerender } = await renderHook(
      ({ ready }: { ready: boolean }) => useAppLock(ready),
      { initialProps: { ready: false } },
    );
    expect(result.current.locked).toBe(false);
    await rerender({ ready: true });
    expect(result.current.locked).toBe(true);

    LA.authenticateAsync.mockResolvedValue({ success: false, error: 'user_cancel' });
    await act(() => result.current.unlock());
    expect(result.current.locked).toBe(true);

    LA.authenticateAsync.mockResolvedValue({ success: true });
    await act(() => result.current.unlock());
    expect(result.current.locked).toBe(false);
  });

  it('re-locks only after more than a minute in the background', async () => {
    const { result } = await renderHook(() => useAppLock(true));
    useSettingsStore.getState().applySettings({ appLockMethod: 'device' });

    await act(async () => {
      emitAppState('background');
      now += RELOCK_AFTER_MS - 1;
      emitAppState('active');
    });
    expect(result.current.locked).toBe(false);

    await act(async () => {
      emitAppState('background');
      now += RELOCK_AFTER_MS + 1;
      emitAppState('active');
    });
    expect(result.current.locked).toBe(true);
  });

  it('never keeps the user out when the phone has no screen lock', async () => {
    phoneWith({ level: 0, biometrics: false });
    useSettingsStore.getState().applySettings({ appLockMethod: 'device' });
    const { result } = await renderHook(() => useAppLock(true));
    await act(async () => {});
    expect(result.current.locked).toBe(false);
  });
});

describe('LockScreen', () => {
  async function renderLock(method: 'biometric' | 'device', onUnlock: () => void) {
    await render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <LockScreen method={method} authenticating={false} onUnlock={onUnlock} />
      </SafeAreaProvider>,
    );
  }

  it('opens the biometric prompt right away', async () => {
    const onUnlock = jest.fn();
    await renderLock('biometric', onUnlock);
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });

  it('waits for a tap on the lock icon in screen-lock mode', async () => {
    const onUnlock = jest.fn();
    await renderLock('device', onUnlock);
    expect(onUnlock).not.toHaveBeenCalled();
    expect(screen.getByText('Expense Tracker is locked')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('lock-screen-icon'));
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });
});

describe('AppLockSettingsView', () => {
  async function renderSettings() {
    await render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <AppLockSettingsView />
      </SafeAreaProvider>,
    );
  }

  it('changes the method only after the user verifies', async () => {
    await renderSettings();
    expect(await screen.findByText('Fingerprint')).toBeTruthy();

    LA.authenticateAsync.mockResolvedValue({ success: false, error: 'user_cancel' });
    await fireEvent.press(screen.getByText('Phone screen lock'));
    expect(useSettingsStore.getState().appLockMethod).toBe('off');

    LA.authenticateAsync.mockResolvedValue({ success: true });
    await fireEvent.press(screen.getByText('Phone screen lock'));
    expect(settingsRepository.set).toHaveBeenCalledWith('appLockMethod', 'device');
    expect(useSettingsStore.getState().appLockMethod).toBe('device');
  });

  it('hides biometrics when none are enrolled', async () => {
    phoneWith({ level: 1, biometrics: false });
    await renderSettings();
    expect(await screen.findByText('Phone screen lock')).toBeTruthy();
    expect(screen.queryByText('Fingerprint')).toBeNull();
  });

  it('explains how to enable it when the phone has no screen lock', async () => {
    phoneWith({ level: 0, biometrics: false });
    await renderSettings();
    expect(await screen.findByText(/Your phone has no screen lock/)).toBeTruthy();
    expect(screen.queryByText('Phone screen lock')).toBeNull();
  });
});
