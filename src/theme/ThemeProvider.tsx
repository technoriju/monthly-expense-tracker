import { createContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useSettingsStore } from '@/store/settingsStore';

import { lightTheme, resolveTheme, type Theme } from './theme';

export const ThemeContext = createContext<Theme>(lightTheme);

/** Provides the theme for the saved mode; `system` re-renders when the device appearance changes. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const systemScheme = useColorScheme();
  const scheme = systemScheme === 'dark' || systemScheme === 'light' ? systemScheme : null;
  return <ThemeContext value={resolveTheme(themeMode, scheme)}>{children}</ThemeContext>;
}
