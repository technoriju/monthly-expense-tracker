import type { LucideIcon } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { makeStyles, useTheme } from '@/theme';

import { AppIcon } from './AppIcon';
import { AppText } from './AppText';

export interface AppChipProps {
  /** Already-translated label. */
  label: string;
  onPress: () => void;
  selected?: boolean;
  icon?: LucideIcon;
  accessibilityHint?: string;
  /** `radio` for single-choice groups, `button` for chips that open something. */
  role?: 'radio' | 'button';
}

/** Compact pill used for filters and option groups. */
export function AppChip({
  label,
  onPress,
  selected = false,
  icon,
  accessibilityHint,
  role = 'radio',
}: AppChipProps) {
  const styles = useStyles();
  const { spacing } = useTheme();
  const foreground = selected ? 'onPrimary' : 'textPrimary';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { checked: selected } : { selected }}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      hitSlop={{ top: spacing.xs, bottom: spacing.xs }}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.selected : styles.unselected,
        pressed && styles.pressed,
      ]}>
      {icon ? (
        <AppIcon icon={icon} size="sm" color={selected ? 'onPrimary' : 'textSecondary'} />
      ) : null}
      <AppText variant="bodySmall" color={foreground} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  chip: {
    minHeight: t.layout.chipHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
    paddingHorizontal: t.spacing.md,
    borderRadius: t.radius.pill,
    borderWidth: t.layout.borderWidth,
  },
  selected: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
  unselected: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
  pressed: { opacity: t.layout.pressedOpacity },
}));
