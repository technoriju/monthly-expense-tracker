import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { settingsService } from '@/features/settings/services/settingsService';
import { useSettingsStore } from '@/store/settingsStore';
import { useUiStore } from '@/store/uiStore';

import { appLockService } from '../services/appLockService';
import type { AppLockMethod } from '../types';
import { useAppLockCapabilities } from './useAppLockCapabilities';

/** Changes the lock method, but only after the user verifies with the phone's lock. */
export function useAppLockSettings() {
  const { t } = useTranslation('settings');
  const showToast = useUiStore((s) => s.showToast);
  const method = useSettingsStore((s) => s.appLockMethod);
  const capabilities = useAppLockCapabilities();
  const [pending, setPending] = useState<AppLockMethod | null>(null);

  /** Returns true when the method was verified and saved. */
  async function selectMethod(next: AppLockMethod): Promise<boolean> {
    if (pending) return false;
    setPending(next);
    try {
      const result = await appLockService.authenticate(t('appLock.prompt'), t('appLock.cancel'));
      if (result !== 'success') {
        if (result === 'failed') showToast(t('appLock.authFailed'), 'error');
        return false;
      }
      await settingsService.setAppLockMethod(next);
      showToast(next === 'off' ? t('appLock.turnedOff') : t('appLock.turnedOn'), 'success');
      return true;
    } catch (error) {
      console.error('Saving app lock failed', error);
      showToast(t('errors.saveFailed'), 'error');
      return false;
    } finally {
      setPending(null);
    }
  }

  return { method, capabilities, pending, selectMethod };
}
