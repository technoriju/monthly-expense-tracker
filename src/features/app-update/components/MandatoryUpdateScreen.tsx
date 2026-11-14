import { CircleArrowUp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppButton, AppScreen, AppText } from '@/components/ui';
import { getAppInfo } from '@/features/settings/appInfo';
import { useSettingsStore } from '@/store/settingsStore';
import { makeStyles, useTheme } from '@/theme';

import { pickLocalized } from '../schema';
import type { UpdateGate } from '../hooks/useUpdateGate';
import { ReleaseNotesList } from './ReleaseNotesList';

/**
 * Shown instead of the whole navigator while this version is unsupported, so no screen, tab,
 * back stack or deep link is reachable. There is deliberately no close or "Later" action.
 */
export function MandatoryUpdateScreen({ gate }: { gate: UpdateGate }) {
  const styles = useStyles();
  const { colors, layout } = useTheme();
  const { t } = useTranslation('appUpdate');
  const language = useSettingsStore((s) => s.uiLanguage);
  const message = pickLocalized(gate.config?.message, language);
  const latest = gate.config?.latestVersion;

  return (
    <AppScreen edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.body} testID="mandatory-update-screen">
        <View style={styles.art}>
          <CircleArrowUp
            size={layout.onboardingArtIconSize}
            color={colors.primary}
            strokeWidth={1.75}
            accessible={false}
            importantForAccessibility="no"
          />
        </View>
        <AppText variant="heading1" align="center" accessibilityRole="header">
          {t('mandatory.title')}
        </AppText>
        <AppText variant="body" color="textSecondary" align="center">
          {message ?? t('mandatory.message')}
        </AppText>
        <AppText variant="bodySmall" color="textSecondary" align="center">
          {latest
            ? t('versions', { installed: getAppInfo().version, latest })
            : t('installedOnly', { installed: getAppInfo().version })}
        </AppText>
        <AppText variant="bodySmall" color="textSecondary" align="center">
          {t('dataSafe')}
        </AppText>
        <ReleaseNotesList config={gate.config} />
      </View>
      <View style={styles.actions}>
        {gate.storeUnavailable ? (
          <AppText variant="bodySmall" color="expenseText" align="center" accessibilityRole="alert">
            {t('errors.storeUnavailable')}
          </AppText>
        ) : null}
        {gate.error && !gate.checking ? (
          <AppText variant="bodySmall" color="expenseText" align="center" accessibilityRole="alert">
            {t(`errors.${gate.error}`)}
          </AppText>
        ) : null}
        <AppButton
          label={t('actions.updateNow')}
          onPress={gate.openStore}
          fullWidth
          testID="update-now"
        />
        <AppButton
          label={gate.checking ? t('checking') : t('actions.retry')}
          onPress={gate.retry}
          variant="secondary"
          loading={gate.checking}
          disabled={gate.checking}
          fullWidth
          testID="update-retry"
        />
        <AppText variant="caption" color="textSecondary" align="center">
          {t('storeHint')}
        </AppText>
      </View>
    </AppScreen>
  );
}

const useStyles = makeStyles((t) => ({
  body: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.lg,
    paddingVertical: t.spacing.xl,
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
  actions: { gap: t.spacing.md, paddingBottom: t.spacing.lg },
}));
