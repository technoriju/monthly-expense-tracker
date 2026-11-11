import { Platform, type ViewStyle } from 'react-native';

import type { ColorTokens } from './colors';

export interface ShadowTokens {
  card: ViewStyle;
  raised: ViewStyle;
}

export function createShadows(colors: ColorTokens): ShadowTokens {
  return {
    card: Platform.select<ViewStyle>({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      default: { elevation: 2, shadowColor: colors.shadow },
    }),
    raised: Platform.select<ViewStyle>({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.28,
        shadowRadius: 16,
      },
      default: { elevation: 8, shadowColor: colors.primary },
    }),
  };
}
