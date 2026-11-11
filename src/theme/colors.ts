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
  chart: {
    blue: palette.chartBlue,
    purple: palette.chartPurple,
    orange: palette.chartOrange,
    pink: palette.chartPink,
    cyan: palette.chartCyan,
  },
};
