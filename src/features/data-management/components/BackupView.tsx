import { Check, FolderDown, Share2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppButton, AppCard, AppHeader, AppIcon, AppScreen, AppText } from '@/components/ui';
import { makeStyles } from '@/theme';

import { useBackup } from '../hooks/useBackup';

const INCLUDED = ['transactions', 'categories', 'budgets', 'preferences'] as const;

export function BackupView() {
  const styles = useStyles();
  const { t } = useTranslation('dataManagement');
  const { exportBackup, busy } = useBackup();

  return (
    <AppScreen
      header={<AppHeader title={t('backup.title')} back />}
      edges={['top', 'left', 'right', 'bottom']}>
      <AppText variant="body" color="textSecondary">
        {t('backup.intro')}
      </AppText>

      <AppCard padding="lg" style={styles.card}>
        <AppText variant="bodyMedium" accessibilityRole="header">
          {t('backup.includesTitle')}
        </AppText>
        {INCLUDED.map((item) => (
          <View key={item} style={styles.item}>
            <AppIcon icon={Check} size="sm" color="income" strokeWidth={2.5} />
            <AppText variant="bodySmall" style={styles.itemText}>
              {t(`backup.includes.${item}`)}
            </AppText>
          </View>
        ))}
      </AppCard>

      <AppText variant="bodySmall" color="textSecondary">
        {t('backup.privacyNote')}
      </AppText>

      <View style={styles.actions}>
        <AppButton
          label={t('backup.share')}
          icon={Share2}
          onPress={() => void exportBackup('share')}
          loading={busy === 'share'}
          disabled={busy !== null}
          accessibilityHint={t('backup.shareHint')}
          fullWidth
        />
        <AppText variant="caption" color="textSecondary" align="center">
          {t('backup.shareHint')}
        </AppText>
        <AppButton
          label={t('backup.saveToFolder')}
          icon={FolderDown}
          variant="secondary"
          onPress={() => void exportBackup('folder')}
          loading={busy === 'folder'}
          disabled={busy !== null}
          accessibilityHint={t('backup.saveToFolderHint')}
          fullWidth
        />
        <AppText variant="caption" color="textSecondary" align="center">
          {t('backup.saveToFolderHint')}
        </AppText>
      </View>
    </AppScreen>
  );
}

const useStyles = makeStyles((t) => ({
  card: { gap: t.spacing.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  itemText: { flex: 1 },
  actions: { gap: t.spacing.sm },
}));
