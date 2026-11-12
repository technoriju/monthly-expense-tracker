import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppCard, AppHeader, AppLoading, AppScreen, AppText } from '@/components/ui';
import { RadioOptionRow } from '@/features/settings/components/RadioOptionRow';
import { makeStyles } from '@/theme';

import { useAppLockSettings } from '../hooks/useAppLockSettings';
import { appLockMethodLabelKey } from '../methodLabel';
import type { AppLockMethod } from '../types';

/** Settings → App lock: Off, biometrics (if enrolled) or the phone's screen lock. */
export function AppLockSettingsView() {
  const styles = useStyles();
  const { t } = useTranslation('settings');
  const { method, capabilities, pending, selectMethod } = useAppLockSettings();

  const options: AppLockMethod[] = !capabilities
    ? []
    : [
        'off',
        ...(capabilities.hasBiometrics ? (['biometric'] as const) : []),
        ...(capabilities.hasSecurity ? (['device'] as const) : []),
      ];
  const kind = capabilities?.biometricKind ?? 'other';

  return (
    <AppScreen
      header={<AppHeader title={t('appLock.title')} back />}
      edges={['top', 'left', 'right', 'bottom']}>
      <AppText variant="body" color="textSecondary">
        {t('appLock.description')}
      </AppText>
      {capabilities ? (
        <AppCard padding="lg" style={styles.card}>
          <View accessibilityRole="radiogroup">
            {options.map((option, i) => (
              <RadioOptionRow
                key={option}
                label={t(appLockMethodLabelKey(option, kind))}
                description={t(`appLock.hints.${option}`)}
                selected={option === method}
                loading={pending === option}
                showDivider={i > 0}
                onPress={() => {
                  if (option !== method) void selectMethod(option);
                }}
              />
            ))}
          </View>
        </AppCard>
      ) : (
        <AppLoading />
      )}
      {capabilities && !capabilities.hasSecurity ? (
        <AppText variant="bodySmall" color="textSecondary">
          {t('appLock.noSecurity')}
        </AppText>
      ) : null}
    </AppScreen>
  );
}

const useStyles = makeStyles((t) => ({
  card: { paddingVertical: t.spacing.xs },
}));
