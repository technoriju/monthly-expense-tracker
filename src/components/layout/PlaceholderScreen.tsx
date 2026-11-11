import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { AppEmptyState, AppHeader, AppScreen } from '@/components/ui';
import { makeStyles } from '@/theme';

export interface PlaceholderScreenProps {
  title: string;
  message: string;
  icon: LucideIcon;
  /** Stack screens show a back button and include the bottom safe area. */
  isStackScreen?: boolean;
}

/** Shared "coming soon" screen for features scheduled in later phases. */
export function PlaceholderScreen({
  title,
  message,
  icon,
  isStackScreen = false,
}: PlaceholderScreenProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  return (
    <AppScreen
      header={<AppHeader title={title} back={isStackScreen} />}
      scroll={false}
      edges={isStackScreen ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']}
      contentStyle={styles.centered}>
      <AppEmptyState icon={icon} title={t('status.comingSoon')} message={message} />
    </AppScreen>
  );
}

const useStyles = makeStyles(() => ({
  centered: { justifyContent: 'center' },
}));
