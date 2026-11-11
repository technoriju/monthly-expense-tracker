import { createContext, type ReactNode } from 'react';

import { useSettingsStore } from '@/store/settingsStore';

import { lightTheme, resolveTheme, type Theme } from './theme';

export const ThemeContext = createContext<Theme>(lightTheme);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const themeMode = useSettingsStore((s) => s.themeMode);
  return <ThemeContext value={resolveTheme(themeMode)}>{children}</ThemeContext>;
}
