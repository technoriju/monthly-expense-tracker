import { User } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppIcon, AppText } from '@/components/ui';
import { makeStyles } from '@/theme';
import { getGreetingKey } from '@/utils/dates';

export function DashboardGreeting({ now }: { now: Date }) {
  const styles = useStyles();
  const { t } = useTranslation('dashboard');
  return (
    <View style={styles.root}>
      <View style={styles.text}>
        <AppText variant="heading2" accessibilityRole="header">
          {t('greeting.hello')}
        </AppText>
        <AppText variant="body" color="textSecondary">
          {t(`greeting.${getGreetingKey(now)}`)}
        </AppText>
      </View>
      <View style={styles.avatar} accessible accessibilityLabel={t('profileLabel')}>
        <AppIcon icon={User} size="lg" color="primary" />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md, paddingTop: t.spacing.md },
  text: { flex: 1 },
  avatar: {
    width: t.layout.avatarSize,
    height: t.layout.avatarSize,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
