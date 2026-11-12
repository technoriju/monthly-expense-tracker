import { useTranslation } from 'react-i18next';

import { AppCard, AppHeader, AppScreen, AppText } from '@/components/ui';
import { makeStyles } from '@/theme';

const SECTIONS = ['local', 'account', 'cloud', 'voice', 'backups', 'deletion'] as const;

/** Plain statements of how data is handled — facts only, no guarantees beyond them. */
export function PrivacyView() {
  const styles = useStyles();
  const { t } = useTranslation('settings');

  return (
    <AppScreen
      header={<AppHeader title={t('privacy.title')} back />}
      edges={['top', 'left', 'right', 'bottom']}>
      {SECTIONS.map((key) => (
        <AppCard key={key} padding="lg" style={styles.card}>
          <AppText variant="bodyMedium" accessibilityRole="header">
            {t(`privacy.${key}.title`)}
          </AppText>
          <AppText variant="bodySmall" color="textSecondary">
            {t(`privacy.${key}.body`)}
          </AppText>
        </AppCard>
      ))}
    </AppScreen>
  );
}

const useStyles = makeStyles((t) => ({
  card: { gap: t.spacing.xs },
}));
