import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { makeStyles, type SpacingToken, useTheme } from '@/theme';

export type AppCardVariant = 'default' | 'income' | 'expense' | 'primary' | 'muted';

export interface AppCardProps extends Pick<
  ViewProps,
  'accessibilityLabel' | 'accessible' | 'testID'
> {
  children: ReactNode;
  variant?: AppCardVariant;
  padding?: SpacingToken;
  style?: StyleProp<ViewStyle>;
}

/** Rounded surface with subtle border + soft shadow (design.md §6 Cards). */
export function AppCard({
  children,
  variant = 'default',
  padding = 'lg',
  style,
  ...rest
}: AppCardProps) {
  const styles = useStyles();
  const { spacing, shadows } = useTheme();
  return (
    <View
      style={[
        styles.base,
        styles[variant],
        variant === 'primary' ? shadows.raised : shadows.card,
        { padding: spacing[padding] },
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  base: {
    borderRadius: t.radius.xl,
    borderWidth: t.layout.borderWidth,
    borderColor: t.colors.border,
  },
  default: { backgroundColor: t.colors.surface },
  income: { backgroundColor: t.colors.incomeSoft, borderColor: t.colors.incomeSoft },
  expense: { backgroundColor: t.colors.expenseSoft, borderColor: t.colors.expenseSoft },
  primary: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
  muted: { backgroundColor: t.colors.primarySoft, borderColor: t.colors.primarySoft },
}));
