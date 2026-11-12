import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { makeStyles, useTheme } from '@/theme';

import { AppText } from './AppText';

export interface AppLoadingProps {
  /** Already-translated visible label. Without it, screen readers still hear "Loading…". */
  label?: string;
  fullScreen?: boolean;
}

export function AppLoading({ label, fullScreen = false }: AppLoadingProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { t } = useTranslation('common');
  return (
    <View
      style={[styles.root, fullScreen && styles.fullScreen]}
      accessibilityRole="progressbar"
      // Screen readers always get a name, even when no visible label is shown.
      accessibilityLabel={label ?? t('status.loading')}
      accessibilityState={{ busy: true }}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? (
        <AppText variant="bodySmall" color="textSecondary">
          {label}
        </AppText>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.md,
    padding: t.spacing.xl,
  },
  fullScreen: { flex: 1, backgroundColor: t.colors.background },
}));
