import { useTranslation } from 'react-i18next';

import { useSettingsStore } from '@/store/settingsStore';
import { useUiStore } from '@/store/uiStore';
import { THEME_MODES, type ThemeMode } from '@/theme';

import { settingsService } from '../services/settingsService';

export function useThemeSettings() {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const { t } = useTranslation('settings');
  const showToast = useUiStore((s) => s.showToast);
  const setThemeMode = (mode: ThemeMode) => {
    if (mode === themeMode) return;
    settingsService.setThemeMode(mode).catch((error: unknown) => {
      console.error('Saving theme failed', error);
      showToast(t('errors.saveFailed'), 'error');
    });
  };
  return { themeMode, options: THEME_MODES, setThemeMode };
}
