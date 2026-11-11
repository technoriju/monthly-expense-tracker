import { router } from 'expo-router';
import { Mic, Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppButton } from '@/components/ui';
import { makeStyles } from '@/theme';

/** Shortcuts to manual entry and voice entry (voice is a placeholder until its phase). */
export function QuickActions() {
  const styles = useStyles();
  const { t } = useTranslation('dashboard');
  return (
    <View style={styles.row}>
      <AppButton
        label={t('quickActions.addTransaction')}
        icon={Plus}
        onPress={() => router.push('/transaction/new')}
        style={styles.button}
      />
      <AppButton
        label={t('quickActions.voiceExpense')}
        icon={Mic}
        variant="secondary"
        onPress={() => router.navigate('/voice')}
        style={styles.button}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', gap: t.spacing.md },
  button: { flex: 1, paddingHorizontal: t.spacing.md },
}));
