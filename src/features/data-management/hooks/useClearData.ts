import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { useUiStore } from '@/store/uiStore';

import { resetService } from '../services/resetService';

/**
 * Returns `confirmClear()`: explains what is deleted (offering a backup first), then asks a
 * second, final confirmation. Data is cleared only after both confirmations.
 */
export function useClearData() {
  const { t } = useTranslation('dataManagement');
  const showToast = useUiStore((s) => s.showToast);

  const clear = () => {
    resetService
      .clearAllData()
      .then(() => showToast(t('clear.success')))
      .catch((error: unknown) => {
        console.error('Clearing data failed', error);
        showToast(t('clear.failed'), 'error');
      });
  };

  const confirmFinal = () => {
    Alert.alert(t('clear.confirmTitle'), t('clear.confirmMessage'), [
      { text: t('clear.cancel'), style: 'cancel' },
      { text: t('clear.confirm'), style: 'destructive', onPress: clear },
    ]);
  };

  return () => {
    Alert.alert(t('clear.title'), t('clear.message'), [
      { text: t('clear.cancel'), style: 'cancel' },
      { text: t('clear.backupFirst'), onPress: () => router.push('/settings/backup') },
      { text: t('clear.continue'), style: 'destructive', onPress: confirmFinal },
    ]);
  };
}
