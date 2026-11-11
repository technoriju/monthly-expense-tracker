import { spacing } from './spacing';

/** Structural layout tokens shared by screens, components and navigation. */
export const layout = {
  screenGutter: spacing.xl,
  sectionGap: spacing.xxl,
  maxContentWidth: 560,
  minTouchTarget: 48,
  buttonHeight: { sm: 40, md: 48 },
  inputHeight: 48,
  headerHeight: 56,
  tabBarHeight: 64,
  tabBarAddButtonSize: 52,
  tabBarAddButtonLift: 18,
  avatarSize: 44,
  categoryIconSize: 44,
  chartPlaceholderHeight: 140,
  chipHeight: 36,
  noteInputHeight: 88,
  sheetMaxHeightRatio: 0.85,
  toastOffset: 24,
  borderWidth: 1,
  hairline: 1,
  pressedOpacity: 0.85,
  disabledOpacity: 0.5,
  iconSize: { sm: 16, md: 20, lg: 24, xl: 28, xxl: 40 },
} as const;

export type IconSizeToken = keyof typeof layout.iconSize;
