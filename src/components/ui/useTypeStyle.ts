import type { TextStyle } from 'react-native';

import { useActiveLanguage } from '@/hooks/useActiveLanguage';
import { resolveFont } from '@/i18n/fonts';
import type { Script } from '@/i18n/languages';
import { lineHeightMultiplier, typography, type TypographyVariant } from '@/theme';

/**
 * Resolves font family + size + line height for a typography variant in the active
 * UI language's script (Inter for Latin, Noto Sans for Indic scripts).
 * `scriptOverride` renders text in a specific script (e.g. native language names).
 */
export function useTypeStyle(variant: TypographyVariant, scriptOverride?: Script): TextStyle {
  const { script: activeScript } = useActiveLanguage();
  const { fontSize, weight } = typography[variant];
  const { fontFamily, lineHeight } = resolveFont(scriptOverride ?? activeScript, weight);
  return {
    fontFamily,
    fontSize,
    lineHeight: Math.round(fontSize * lineHeightMultiplier[lineHeight]),
  };
}
