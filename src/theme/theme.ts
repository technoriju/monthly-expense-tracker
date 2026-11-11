import { lightColors, type ColorTokens } from './colors';
import { layout } from './layout';
import { radius } from './radius';
import { createShadows, type ShadowTokens } from './shadows';
import { spacing } from './spacing';
import { typography } from './typography';

export type ColorScheme = 'light' | 'dark';
/** User preference. Only `light` is implemented; the dark palette awaits approval. */
export type ThemeMode = 'system' | 'light' | 'dark';

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

/**
 * Resolves the active theme for a preference. Dark tokens are not approved yet
 * (ARCHITECTURE.md §6.1), so every mode currently resolves to the light theme.
 */
export function resolveTheme(_mode: ThemeMode): Theme {
  return lightTheme;
}
