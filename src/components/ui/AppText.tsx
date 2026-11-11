import { Text, type TextProps, type TextStyle } from 'react-native';

import type { Script } from '@/i18n/languages';
import { constrainedFontScale, useTheme, type ColorTokens, type TypographyVariant } from '@/theme';

import { useTypeStyle } from './useTypeStyle';

export type TextColorToken = Exclude<keyof ColorTokens, 'chart'>;

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: TextColorToken;
  align?: TextStyle['textAlign'];
  /** Caps accessibility font scaling for layout-critical text (amounts, tab labels). */
  constrainScale?: boolean;
  /** Render in a specific script's font instead of the UI language's (e.g. "বাংলা" in an English UI). */
  script?: Script;
}

export function AppText({
  variant = 'body',
  color = 'textPrimary',
  align,
  constrainScale = false,
  script,
  style,
  ...rest
}: AppTextProps) {
  const { colors } = useTheme();
  const typeStyle = useTypeStyle(variant, script);
  return (
    <Text
      maxFontSizeMultiplier={constrainScale ? constrainedFontScale : undefined}
      style={[typeStyle, { color: colors[color], textAlign: align }, style]}
      {...rest}
    />
  );
}
