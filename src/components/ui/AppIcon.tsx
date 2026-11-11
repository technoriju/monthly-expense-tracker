import type { LucideIcon } from 'lucide-react-native';
import { I18nManager } from 'react-native';

import { layout, useTheme, type IconSizeToken } from '@/theme';

import type { TextColorToken } from './AppText';

export interface AppIconProps {
  icon: LucideIcon;
  size?: IconSizeToken;
  color?: TextColorToken;
  strokeWidth?: number;
  /** Flip horizontally in RTL layouts (directional icons such as arrows and chevrons). */
  mirrorInRTL?: boolean;
}

/** Lucide icon bound to theme tokens. Decorative: hidden from screen readers. */
export function AppIcon({
  icon: Icon,
  size = 'md',
  color = 'textPrimary',
  strokeWidth = 2,
  mirrorInRTL = false,
}: AppIconProps) {
  const { colors } = useTheme();
  return (
    <Icon
      size={layout.iconSize[size]}
      color={colors[color]}
      strokeWidth={strokeWidth}
      style={mirrorInRTL && I18nManager.isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
      accessible={false}
      importantForAccessibility="no"
    />
  );
}
