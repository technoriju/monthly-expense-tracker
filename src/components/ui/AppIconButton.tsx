import type { LucideIcon } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { makeStyles, type IconSizeToken } from '@/theme';

import { AppIcon } from './AppIcon';
import type { TextColorToken } from './AppText';

export interface AppIconButtonProps {
  icon: LucideIcon;
  onPress: () => void;
  /** Required: icon-only controls need a spoken label. */
  accessibilityLabel: string;
  variant?: 'plain' | 'soft';
  size?: IconSizeToken;
  color?: TextColorToken;
  mirrorInRTL?: boolean;
  disabled?: boolean;
}

export function AppIconButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'plain',
  size = 'lg',
  color = 'textPrimary',
  mirrorInRTL,
  disabled = false,
}: AppIconButtonProps) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.base,
        variant === 'soft' && styles.soft,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <AppIcon icon={icon} size={size} color={color} mirrorInRTL={mirrorInRTL} />
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  base: {
    minWidth: t.layout.minTouchTarget,
    minHeight: t.layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.radius.md,
  },
  soft: {
    backgroundColor: t.colors.surface,
    borderWidth: t.layout.borderWidth,
    borderColor: t.colors.border,
  },
  pressed: { opacity: t.layout.pressedOpacity },
  disabled: { opacity: t.layout.disabledOpacity },
}));
