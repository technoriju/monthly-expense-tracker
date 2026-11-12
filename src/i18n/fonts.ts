// Deep imports: the package index requires every weight, which bundles ~24 unused font files.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { NotoSansBengali_400Regular } from '@expo-google-fonts/noto-sans-bengali/400Regular';
import { NotoSansBengali_500Medium } from '@expo-google-fonts/noto-sans-bengali/500Medium';
import { NotoSansBengali_600SemiBold } from '@expo-google-fonts/noto-sans-bengali/600SemiBold';
import { NotoSansBengali_700Bold } from '@expo-google-fonts/noto-sans-bengali/700Bold';
import { NotoSansDevanagari_400Regular } from '@expo-google-fonts/noto-sans-devanagari/400Regular';
import { NotoSansDevanagari_500Medium } from '@expo-google-fonts/noto-sans-devanagari/500Medium';
import { NotoSansDevanagari_600SemiBold } from '@expo-google-fonts/noto-sans-devanagari/600SemiBold';
import { NotoSansDevanagari_700Bold } from '@expo-google-fonts/noto-sans-devanagari/700Bold';
import type { FontSource } from 'expo-font';

import type { FontWeightToken, LineHeightClass } from '@/theme';

import type { Script } from './languages';

/**
 * Script → font configuration (ARCHITECTURE.md §6.3).
 *
 * Custom fonts need one family name per weight, so components never rely on `fontWeight`.
 * To add a script (Phase 5): install its `@expo-google-fonts/noto-sans-*` package, add a
 * `ScriptFontConfig` entry below. Scripts without an entry fall back to the system font
 * (family `undefined`) with Indic line heights.
 */
interface ScriptFontConfig {
  families: Record<FontWeightToken, string>;
  sources: Record<string, FontSource>;
  lineHeight: LineHeightClass;
}

const SCRIPT_FONTS: Partial<Record<Script, ScriptFontConfig>> = {
  latin: {
    families: {
      regular: 'Inter_400Regular',
      medium: 'Inter_500Medium',
      semiBold: 'Inter_600SemiBold',
      bold: 'Inter_700Bold',
    },
    sources: { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold },
    lineHeight: 'latin',
  },
  bengali: {
    families: {
      regular: 'NotoSansBengali_400Regular',
      medium: 'NotoSansBengali_500Medium',
      semiBold: 'NotoSansBengali_600SemiBold',
      bold: 'NotoSansBengali_700Bold',
    },
    sources: {
      NotoSansBengali_400Regular,
      NotoSansBengali_500Medium,
      NotoSansBengali_600SemiBold,
      NotoSansBengali_700Bold,
    },
    lineHeight: 'indic',
  },
  devanagari: {
    families: {
      regular: 'NotoSansDevanagari_400Regular',
      medium: 'NotoSansDevanagari_500Medium',
      semiBold: 'NotoSansDevanagari_600SemiBold',
      bold: 'NotoSansDevanagari_700Bold',
    },
    sources: {
      NotoSansDevanagari_400Regular,
      NotoSansDevanagari_500Medium,
      NotoSansDevanagari_600SemiBold,
      NotoSansDevanagari_700Bold,
    },
    lineHeight: 'indic',
  },
};

/** Every font file to load at startup (passed to `useFonts`). */
export const FONT_SOURCES: Record<string, FontSource> = Object.assign(
  {},
  ...Object.values(SCRIPT_FONTS).map((c) => c.sources),
);

export interface ResolvedFont {
  fontFamily: string | undefined;
  lineHeight: LineHeightClass;
}

export function resolveFont(script: Script, weight: FontWeightToken): ResolvedFont {
  const config = SCRIPT_FONTS[script];
  if (!config) return { fontFamily: undefined, lineHeight: 'indic' };
  return { fontFamily: config.families[weight], lineHeight: config.lineHeight };
}
