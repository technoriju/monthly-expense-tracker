import { ShieldCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppButton, AppScreen, AppText } from '@/components/ui';
import { makeStyles, useTheme } from '@/theme';

import { useAppLockSettings } from '../hooks/useAppLockSettings';
import { appLockMethodLabelKey } from '../methodLabel';
import type { AppLockMethod } from '../types';

export interface AppLockSetupStepProps {
  /** Called after the lock is turned on, or when the user skips. */
  onDone: () => void;
  /** Disables the buttons while the caller finishes up. */
  finishing?: boolean;
}

/** Last onboarding step: offer to protect the app with the phone's own lock. */
export function AppLockSetupStep({ onDone, finishing = false }: AppLockSetupStepProps) {
  const styles = useStyles();
  const { colors, layout } = useTheme();
  const { t } = useTranslation('onboarding');
  const { t: ts } = useTranslation('settings');
  const { capabilities, pending, selectMethod } = useAppLockSettings();
  const busy = pending !== null || finishing;

  async function choose(method: AppLockMethod) {
    if (await selectMethod(method)) onDone();
  }

  return (
    <AppScreen scroll={false} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.body}>
        <View style={styles.art}>
          <ShieldCheck
            size={layout.onboardingArtIconSize}
            color={colors.primary}
            strokeWidth={1.75}
            accessible={false}
            importantForAccessibility="no"
          />
        </View>
        <AppText variant="heading1" align="center" accessibilityRole="header">
          {t('appLock.title')}
        </AppText>
        <AppText variant="body" color="textSecondary" align="center">
          {t('appLock.body')}
        </AppText>
      </View>
      <View style={styles.actions}>
        {capabilities?.hasBiometrics ? (
          <AppButton
            label={t('appLock.use', {
              method: ts(appLockMethodLabelKey('biometric', capabilities.biometricKind)),
            })}
            onPress={() => void choose('biometric')}
            loading={pending === 'biometric'}
            disabled={busy}
            fullWidth
            testID="applock-setup-biometric"
          />
        ) : null}
        <AppButton
          label={t('appLock.use', { method: ts('appLock.device') })}
          variant={capabilities?.hasBiometrics ? 'secondary' : 'primary'}
          onPress={() => void choose('device')}
          loading={pending === 'device'}
          disabled={busy}
          fullWidth
          testID="applock-setup-device"
        />
        <AppButton
          label={t('appLock.skip')}
          variant="ghost"
          onPress={onDone}
          loading={finishing}
          disabled={busy}
          fullWidth
          testID="applock-setup-skip"
        />
      </View>
    </AppScreen>
  );
}

const useStyles = makeStyles((t) => ({
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.lg,
    paddingHorizontal: t.spacing.sm,
  },
  art: {
    width: t.layout.onboardingArtSize,
    height: t.layout.onboardingArtSize,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: t.spacing.lg,
  },
  actions: { gap: t.spacing.sm },
}));
