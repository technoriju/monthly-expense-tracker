import { Fingerprint, LockKeyhole } from 'lucide-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton, AppScreen, AppText } from '@/components/ui';
import { makeStyles, useTheme } from '@/theme';

import type { AppLockMethod } from '../types';

export interface LockScreenProps {
  method: AppLockMethod;
  authenticating: boolean;
  onUnlock: () => void;
}

/**
 * Full-screen cover shown over the navigator while the app is locked. Biometric mode opens the
 * system prompt right away; screen-lock mode waits for a tap on the lock icon.
 */
export function LockScreen({ method, authenticating, onUnlock }: LockScreenProps) {
  const styles = useStyles();
  const { colors, layout } = useTheme();
  const { t } = useTranslation('settings');
  const biometric = method === 'biometric';
  const Icon = biometric ? Fingerprint : LockKeyhole;

  useEffect(() => {
    if (biometric) onUnlock();
    // Only on mount: each lock mounts a fresh cover.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.cover} testID="lock-screen">
      <AppScreen scroll={false} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.body}>
          <Pressable
            onPress={onUnlock}
            disabled={authenticating}
            accessibilityRole="button"
            accessibilityLabel={t('appLock.unlock')}
            testID="lock-screen-icon"
            style={({ pressed }) => [styles.art, pressed && styles.pressed]}>
            <Icon
              size={layout.onboardingArtIconSize}
              color={colors.primary}
              strokeWidth={1.75}
              accessible={false}
              importantForAccessibility="no"
            />
          </Pressable>
          <AppText variant="heading1" align="center" accessibilityRole="header">
            {t('appLock.lockedTitle')}
          </AppText>
          <AppText variant="body" color="textSecondary" align="center">
            {biometric ? t('appLock.lockedBiometricHint') : t('appLock.lockedDeviceHint')}
          </AppText>
        </View>
        <AppButton
          label={t('appLock.unlock')}
          onPress={onUnlock}
          loading={authenticating}
          fullWidth
          testID="lock-screen-unlock"
        />
      </AppScreen>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  cover: { ...StyleSheet.absoluteFill, backgroundColor: t.colors.background },
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
  pressed: { opacity: t.layout.pressedOpacity },
}));
