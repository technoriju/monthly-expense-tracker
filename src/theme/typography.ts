/** Typography scale — docs/design.md §3. Font family is resolved per script at render time. */
export type FontWeightToken = 'regular' | 'medium' | 'semiBold' | 'bold';

export interface TypeStyle {
  fontSize: number;
  weight: FontWeightToken;
}

export const typography = {
  display: { fontSize: 32, weight: 'bold' },
  heading1: { fontSize: 24, weight: 'bold' },
  heading2: { fontSize: 20, weight: 'bold' },
  heading3: { fontSize: 18, weight: 'semiBold' },
  body: { fontSize: 15, weight: 'regular' },
  bodyMedium: { fontSize: 15, weight: 'medium' },
  bodySmall: { fontSize: 13, weight: 'regular' },
  caption: { fontSize: 11, weight: 'regular' },
  button: { fontSize: 14, weight: 'semiBold' },
  amountLarge: { fontSize: 28, weight: 'bold' },
  amountMedium: { fontSize: 20, weight: 'bold' },
} as const satisfies Record<string, TypeStyle>;

export type TypographyVariant = keyof typeof typography;

/**
 * Line-height multipliers. Indic scripts need more vertical room so matras,
 * conjuncts and descenders are not clipped (ARCHITECTURE.md §6.1).
 */
export const lineHeightMultiplier = {
  latin: 1.3,
  indic: 1.5,
} as const;

export type LineHeightClass = keyof typeof lineHeightMultiplier;

/** Cap for accessibility font scaling on layout-critical text (amounts, tab labels). */
export const constrainedFontScale = 1.4;
