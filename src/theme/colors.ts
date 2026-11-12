/**
 * Raw brand palette — verbatim from docs/design.md §2.
 * Features and screens must not use these directly; use semantic tokens (`lightColors`).
 */
export const palette = {
  primary: '#5B2ED6',
  primaryDark: '#3D1AA8',
  primaryLight: '#EDE7FF',

  secondary: '#FF9F1C',
  secondaryLight: '#FFF0D9',

  background: '#F7F6FC',
  surface: '#FFFFFF',

  textPrimary: '#17152A',
  textSecondary: '#77758A',
  textMuted: '#A09CB3',

  border: '#E9E5F3',

  income: '#16A34A',
  incomeBackground: '#E9F9EF',

  expense: '#EF4444',
  expenseBackground: '#FFF0F1',

  info: '#2563EB',
  infoBackground: '#EAF2FF',

  chartBlue: '#3568FF',
  chartPurple: '#7C3AED',
  chartOrange: '#FF9F43',
  chartPink: '#D946EF',
  chartCyan: '#22C1D6',

  white: '#FFFFFF',
  shadow: '#2A1B6B',
  /** textPrimary (#17152A) at 40% — modal backdrop. */
  overlay: 'rgba(23, 21, 42, 0.4)',
} as const;

/**
 * Dark palette — ARCHITECTURE.md §6.1 (proposed there, approved 2026-11-12). Not from the
 * reference image; body-text contrast is enforced by `theme/__tests__/contrast.test.ts`.
 */
export const darkPalette = {
  background: '#0F0D1A',
  surface: '#1A1729',
  surfaceMuted: '#231F36',
  // §6.1 proposed #7C5CFF; darkened so white text on primary fills meets 4.5:1.
  primary: '#7857FA',
  primaryPressed: '#5B2ED6',
  primarySoft: '#2A2050',
  onPrimaryMuted: '#E4DCFF',
  textPrimary: '#F4F2FA',
  textSecondary: '#A8A5BC',
  textMuted: '#6F6B86',
  border: '#2E2A45',
  income: '#22C55E',
  incomeSoft: '#12301F',
  expense: '#F87171',
  expenseSoft: '#3A1A1E',
  accent: '#FFB04D',
  accentSoft: '#3A2A12',
  info: '#60A5FA',
  infoSoft: '#142640',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.6)',
  // Chart series: the light hues, lightened for a dark background.
  chartBlue: '#5C86FF',
  chartPurple: '#9563F0',
  chartOrange: '#FFB066',
  chartPink: '#E26BF3',
  chartCyan: '#4DD0E1',
} as const;

/** Semantic color tokens consumed by components. */
export interface ColorTokens {
  background: string;
  surface: string;
  surfaceMuted: string;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  onPrimary: string;
  onPrimaryMuted: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  income: string;
  incomeSoft: string;
  expense: string;
  expenseSoft: string;
  accent: string;
  accentSoft: string;
  info: string;
  infoSoft: string;
  shadow: string;
  /** Modal / sheet backdrop. */
  overlay: string;
  /** High-emphasis surface with inverted contrast (toast). */
  inverseSurface: string;
  onInverseSurface: string;
  chart: {
    blue: string;
    purple: string;
    orange: string;
    pink: string;
    cyan: string;
  };
}

export const lightColors: ColorTokens = {
  background: palette.background,
  surface: palette.surface,
  surfaceMuted: palette.primaryLight,
  primary: palette.primary,
  primaryPressed: palette.primaryDark,
  primarySoft: palette.primaryLight,
  onPrimary: palette.white,
  onPrimaryMuted: palette.primaryLight,
  textPrimary: palette.textPrimary,
  textSecondary: palette.textSecondary,
  textMuted: palette.textMuted,
  border: palette.border,
  income: palette.income,
  incomeSoft: palette.incomeBackground,
  expense: palette.expense,
  expenseSoft: palette.expenseBackground,
  accent: palette.secondary,
  accentSoft: palette.secondaryLight,
  info: palette.info,
  infoSoft: palette.infoBackground,
  shadow: palette.shadow,
  overlay: palette.overlay,
  inverseSurface: palette.textPrimary,
  onInverseSurface: palette.white,
  chart: {
    blue: palette.chartBlue,
    purple: palette.chartPurple,
    orange: palette.chartOrange,
    pink: palette.chartPink,
    cyan: palette.chartCyan,
  },
};

export const darkColors: ColorTokens = {
  background: darkPalette.background,
  surface: darkPalette.surface,
  surfaceMuted: darkPalette.surfaceMuted,
  primary: darkPalette.primary,
  primaryPressed: darkPalette.primaryPressed,
  primarySoft: darkPalette.primarySoft,
  onPrimary: palette.white,
  onPrimaryMuted: darkPalette.onPrimaryMuted,
  textPrimary: darkPalette.textPrimary,
  textSecondary: darkPalette.textSecondary,
  textMuted: darkPalette.textMuted,
  border: darkPalette.border,
  income: darkPalette.income,
  incomeSoft: darkPalette.incomeSoft,
  expense: darkPalette.expense,
  expenseSoft: darkPalette.expenseSoft,
  accent: darkPalette.accent,
  accentSoft: darkPalette.accentSoft,
  info: darkPalette.info,
  infoSoft: darkPalette.infoSoft,
  shadow: darkPalette.shadow,
  overlay: darkPalette.overlay,
  inverseSurface: darkPalette.textPrimary,
  onInverseSurface: palette.textPrimary,
  chart: {
    blue: darkPalette.chartBlue,
    purple: darkPalette.chartPurple,
    orange: darkPalette.chartOrange,
    pink: darkPalette.chartPink,
    cyan: darkPalette.chartCyan,
  },
};
