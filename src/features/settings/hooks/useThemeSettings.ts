import { useSettingsStore } from '@/store/settingsStore';
import { THEME_MODES, type ThemeMode } from '@/theme';

import { settingsService } from '../services/settingsService';

export function useThemeSettings() {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = (mode: ThemeMode) => {
    if (mode === themeMode) return;
    settingsService.setThemeMode(mode).catch((error: unknown) => {
      console.error('Saving theme failed', error);
    });
  };
  return { themeMode, options: THEME_MODES, setThemeMode };
}
