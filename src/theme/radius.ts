/** Corner radius scale — verbatim from docs/design.md §5. */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radius;
