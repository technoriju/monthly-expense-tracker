import { ActivityIndicator, View } from 'react-native';

import { makeStyles, useTheme } from '@/theme';

import { AppText } from './AppText';

export interface AppLoadingProps {
  /** Already-translated label; omit before i18n is ready. */
  label?: string;
  fullScreen?: boolean;
}

export function AppLoading({ label, fullScreen = false }: AppLoadingProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View
      style={[styles.root, fullScreen && styles.fullScreen]}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
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
