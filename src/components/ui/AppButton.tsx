import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles, useTheme } from '@/theme';

import { AppIcon } from './AppIcon';
import { AppText, type TextColorToken } from './AppText';

export type AppButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type AppButtonSize = 'sm' | 'md';

export interface AppButtonProps {
  /** Already-translated label. */
  label: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const FOREGROUND: Record<AppButtonVariant, TextColorToken> = {
  primary: 'onPrimary',
  secondary: 'primary',
  danger: 'expense',
  ghost: 'primary',
};

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  accessibilityHint,
  style,
  testID,
}: AppButtonProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const foreground = FOREGROUND[variant];

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        styles[variant],
        pressed && (variant === 'primary' ? styles.primaryPressed : styles.pressed),
        isDisabled && styles.disabled,
        fullWidth && styles.fullWidth,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={colors[foreground]} />
      ) : (
        <View style={styles.content}>
          {icon ? <AppIcon icon={icon} size="md" color={foreground} /> : null}
          <AppText variant="button" color={foreground} numberOfLines={1}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.radius.lg,
    paddingHorizontal: t.spacing.xl,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
  },
  md: { minHeight: t.layout.buttonHeight.md },
  sm: { minHeight: t.layout.buttonHeight.sm, paddingHorizontal: t.spacing.lg },
  primary: { backgroundColor: t.colors.primary },
  primaryPressed: { backgroundColor: t.colors.primaryPressed },
  secondary: { backgroundColor: t.colors.primarySoft },
  danger: { backgroundColor: t.colors.expenseSoft },
  ghost: { backgroundColor: 'transparent' },
  pressed: { opacity: t.layout.pressedOpacity },
  disabled: { opacity: t.layout.disabledOpacity },
  fullWidth: { alignSelf: 'stretch' },
}));
