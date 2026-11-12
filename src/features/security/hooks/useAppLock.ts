import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';

import { useSettingsStore } from '@/store/settingsStore';

import { appLockService } from '../services/appLockService';
import { RELOCK_AFTER_MS } from '../types';

/**
 * App-lock gate for the root layout. Locks once at startup (after settings are hydrated) and
 * again when the app returns from more than `RELOCK_AFTER_MS` in the background.
 */
export function useAppLock(ready: boolean) {
  const { t } = useTranslation('settings');
  const method = useSettingsStore((s) => s.appLockMethod);
  const [locked, setLocked] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [started, setStarted] = useState(false);
  const backgroundAt = useRef<number | null>(null);

  // Cold start: settings are known only once bootstrap is ready. Adjusting state during render
  // (not in an effect) so the cover is there on the very first ready frame.
  if (ready && !started) {
    setStarted(true);
    if (method !== 'off') setLocked(true);
  }

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        backgroundAt.current = Date.now();
        return;
      }
      if (state !== 'active') return;
      const since = backgroundAt.current;
      backgroundAt.current = null;
      if (
        since !== null &&
        Date.now() - since > RELOCK_AFTER_MS &&
        useSettingsStore.getState().appLockMethod !== 'off'
      ) {
        setLocked(true);
      }
    });
    return () => sub.remove();
  }, []);

  // Safety valve: if the phone no longer has any screen lock, the OS prompt cannot succeed,
  // so never keep the user out of their own data.
  useEffect(() => {
    if (!locked) return;
    let cancelled = false;
    appLockService
      .getCapabilities()
      .then((c) => {
        if (!cancelled && !c.hasSecurity) setLocked(false);
      })
      .catch(() => {
        // Keep the lock; the user can still try the system prompt.
      });
    return () => {
      cancelled = true;
    };
  }, [locked]);

  const unlock = useCallback(async () => {
    if (authenticating) return;
    setAuthenticating(true);
    try {
      const result = await appLockService.authenticate(t('appLock.prompt'), t('appLock.cancel'));
      if (result === 'success') setLocked(false);
    } finally {
      setAuthenticating(false);
    }
  }, [authenticating, t]);

  return { locked, method, authenticating, unlock };
}
