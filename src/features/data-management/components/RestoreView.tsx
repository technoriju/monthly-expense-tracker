import {
  ArrowLeftRight,
  CalendarClock,
  FileText,
  Info,
  LayoutGrid,
  PiggyBank,
  TriangleAlert,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { AppButton, AppCard, AppHeader, AppIcon, AppScreen, AppText } from '@/components/ui';
import { SettingsRow } from '@/features/settings/components/SettingsRow';
import { SettingsSection } from '@/features/settings/components/SettingsSection';
import { useFormatters } from '@/hooks/useFormatters';
import { makeStyles, useTheme } from '@/theme';
import { toIsoDate } from '@/utils/dates';

import { useBackup } from '../hooks/useBackup';
import { useRestore } from '../hooks/useRestore';

export function RestoreView() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { t } = useTranslation('dataManagement');
  const format = useFormatters();
  const { state, chooseFile, confirmRestore } = useRestore();
  const { exportBackup, busy } = useBackup();

  const restoring = state.phase === 'restoring';
  const preview = state.phase === 'preview' || state.phase === 'restoring' ? state : null;

  return (
    <AppScreen
      header={<AppHeader title={t('restore.title')} back={!restoring} />}
      edges={['top', 'left', 'right', 'bottom']}>
      <AppText variant="body" color="textSecondary">
        {t('restore.intro')}
      </AppText>

      {state.phase === 'checking' ? (
        <View style={styles.row} accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.primary} />
          <AppText variant="bodySmall" color="textSecondary">
            {t('restore.checking')}
          </AppText>
        </View>
      ) : null}

      {state.phase === 'invalid' ? (
        <AppCard variant="expense" padding="lg" style={styles.row}>
          <AppIcon icon={TriangleAlert} size="md" color="expense" />
          <AppText variant="bodyMedium" style={styles.flex} accessibilityRole="alert">
            {t(`restore.errors.${state.error}`)}
          </AppText>
        </AppCard>
      ) : null}

      {preview ? (
        <>
          <SettingsSection title={t('restore.previewTitle')}>
            <SettingsRow icon={FileText} label={t('restore.file')} value={preview.fileName} />
            <SettingsRow
              icon={CalendarClock}
              label={t('restore.created')}
              value={format.longDate(toIsoDate(new Date(preview.backup.exportedAt)))}
            />
            <SettingsRow
              icon={Info}
              label={t('restore.appVersion')}
              value={preview.backup.appVersion}
            />
            <SettingsRow
              icon={ArrowLeftRight}
              label={t('restore.transactions')}
              value={String(preview.backupCounts.transactions)}
            />
            <SettingsRow
              icon={LayoutGrid}
              label={t('restore.categories')}
              value={String(preview.backupCounts.categories)}
            />
            <SettingsRow
              icon={PiggyBank}
              label={t('restore.budgets')}
              value={String(preview.backupCounts.budgets)}
            />
          </SettingsSection>
          <AppText variant="bodySmall" color="textSecondary">
            {t('restore.preferencesNote')}
          </AppText>

          <AppCard variant="expense" padding="lg" style={styles.warning}>
            <View style={styles.row}>
              <AppIcon icon={TriangleAlert} size="md" color="expense" />
              <AppText variant="bodyMedium" style={styles.flex}>
                {t('restore.warningTitle')}
              </AppText>
            </View>
            <AppText variant="bodySmall" color="textSecondary">
              {t('restore.warningMessage', {
                transactions: preview.currentCounts.transactions,
                budgets: preview.currentCounts.budgets,
              })}
            </AppText>
          </AppCard>
        </>
      ) : null}

      <View style={styles.actions}>
        {preview ? (
          <>
            <AppButton
              label={t('restore.backupFirst')}
              variant="secondary"
              onPress={() => void exportBackup('share')}
              loading={busy !== null}
              disabled={restoring || busy !== null}
              fullWidth
            />
            <AppButton
              label={t('restore.restore')}
              variant="danger"
              onPress={confirmRestore}
              loading={restoring}
              disabled={restoring}
              fullWidth
            />
          </>
        ) : null}
        <AppButton
          label={
            preview || state.phase === 'invalid' ? t('restore.chooseAnother') : t('restore.choose')
          }
          variant={preview ? 'ghost' : 'primary'}
          onPress={() => void chooseFile()}
          disabled={restoring || state.phase === 'checking'}
          fullWidth
        />
      </View>
    </AppScreen>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  flex: { flex: 1 },
  warning: { gap: t.spacing.sm },
  actions: { gap: t.spacing.sm },
}));
