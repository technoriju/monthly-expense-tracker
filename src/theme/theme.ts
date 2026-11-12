import { darkColors, lightColors, type ColorTokens } from './colors';
import { layout } from './layout';
import { radius } from './radius';
import { createShadows, type ShadowTokens } from './shadows';
import { spacing } from './spacing';
import { typography } from './typography';

export type ColorScheme = 'light' | 'dark';
/** User preference; `system` follows the device appearance. */
export type ThemeMode = 'system' | 'light' | 'dark';
export const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

export function isThemeMode(value: unknown): value is ThemeMode {
  return THEME_MODES.includes(value as ThemeMode);
}

export interface Theme {
  scheme: ColorScheme;
  colors: ColorTokens;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  layout: typeof layout;
  shadows: ShadowTokens;
}

function createTheme(scheme: ColorScheme, colors: ColorTokens): Theme {
  return { scheme, colors, spacing, radius, typography, layout, shadows: createShadows(colors) };
}

export const lightTheme = createTheme('light', lightColors);
export const darkTheme = createTheme('dark', darkColors);

/**
 * Resolves the active theme for a preference. `system` follows the device appearance and
 * falls back to light when the device does not report one.
 */
export function resolveTheme(mode: ThemeMode, systemScheme: ColorScheme | null | undefined): Theme {
  const scheme = mode === 'system' ? (systemScheme ?? 'light') : mode;
  return scheme === 'dark' ? darkTheme : lightTheme;
}
