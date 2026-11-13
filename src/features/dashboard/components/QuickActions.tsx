import { router } from 'expo-router';
import { Mic, Plus, ScanText } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppButton } from '@/components/ui';
import { makeStyles } from '@/theme';

/** Shortcuts to manual entry, voice entry and receipt scanning. */
export function QuickActions() {
  const styles = useStyles();
  const { t } = useTranslation('dashboard');
  return (
    <View style={styles.root}>
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
      <AppButton
        label={t('quickActions.scanReceipt')}
        icon={ScanText}
        variant="secondary"
        onPress={() => router.push('/receipt/scan')}
        fullWidth
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: t.spacing.md },
  row: { flexDirection: 'row', gap: t.spacing.md },
  button: { flex: 1, paddingHorizontal: t.spacing.md },
}));
