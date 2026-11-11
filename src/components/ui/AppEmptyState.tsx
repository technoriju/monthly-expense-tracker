import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { makeStyles } from '@/theme';

import { AppButton } from './AppButton';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';

export interface AppEmptyStateProps {
  icon: LucideIcon;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
  tone?: 'default' | 'error';
}

export function AppEmptyState({
  icon,
  title,
  message,
  action,
  tone = 'default',
}: AppEmptyStateProps) {
  const styles = useStyles();
  const isError = tone === 'error';
  return (
    <View style={styles.root} accessibilityRole={isError ? 'alert' : undefined}>
      <View style={[styles.iconWrap, isError && styles.iconWrapError]}>
        <AppIcon icon={icon} size="xl" color={isError ? 'expense' : 'primary'} />
      </View>
      <AppText variant="heading3" align="center" accessibilityRole="header">
        {title}
      </AppText>
      {message ? (
        <AppText variant="body" color="textSecondary" align="center">
          {message}
        </AppText>
      ) : null}
      {action ? (
        <AppButton label={action.label} onPress={action.onPress} variant="secondary" />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.md,
    paddingHorizontal: t.spacing.xxl,
    paddingVertical: t.spacing.xxxl,
  },
  iconWrap: {
    width: t.layout.avatarSize + t.spacing.xl,
    height: t.layout.avatarSize + t.spacing.xl,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: t.spacing.xs,
  },
  iconWrapError: { backgroundColor: t.colors.expenseSoft },
}));
