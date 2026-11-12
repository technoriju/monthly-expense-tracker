import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { useUiStore } from '@/store/uiStore';

import type { BackupDocument } from '../backupFormat';
import type { BackupErrorCode } from '../backupValidation';
import { countBackup, restoreService } from '../services/restoreService';
import type { DataCounts } from '../types';

export type RestoreState =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'invalid'; error: BackupErrorCode | 'readFailed' }
  | {
      phase: 'preview' | 'restoring';
      backup: BackupDocument;
      fileName: string;
      backupCounts: DataCounts;
      currentCounts: DataCounts;
    };

/**
 * Pick → validate → preview → confirm → restore. A file is restored only from the preview
 * state (i.e. after validation) and only after the user confirms the replacement.
 */
export function useRestore() {
  const { t } = useTranslation('dataManagement');
  const showToast = useUiStore((s) => s.showToast);
  const [state, setState] = useState<RestoreState>({ phase: 'idle' });

  const chooseFile = async () => {
    if (state.phase === 'checking' || state.phase === 'restoring') return;
    const previous = state;
    setState({ phase: 'checking' });
    try {
      const result = await restoreService.pickBackup();
      if (result.status === 'cancelled') return setState(previous);
      if (result.status === 'invalid') return setState({ phase: 'invalid', error: result.error });
      setState({
        phase: 'preview',
        backup: result.backup,
        fileName: result.fileName,
        backupCounts: countBackup(result.backup),
        currentCounts: await restoreService.currentCounts(),
      });
    } catch (error) {
      console.error('Reading backup failed', error);
      setState({ phase: 'invalid', error: 'readFailed' });
    }
  };

  const restore = async () => {
    if (state.phase !== 'preview') return;
    setState({ ...state, phase: 'restoring' });
    try {
      await restoreService.restore(state.backup);
      showToast(t('restore.success'));
      router.back();
    } catch (error) {
      console.error('Restore failed', error);
      showToast(t('restore.failed'), 'error');
      setState({ ...state, phase: 'preview' });
    }
  };

  const confirmRestore = () => {
    if (state.phase !== 'preview') return;
    Alert.alert(t('restore.confirmTitle'), t('restore.confirmMessage'), [
      { text: t('restore.cancel'), style: 'cancel' },
      { text: t('restore.confirm'), style: 'destructive', onPress: () => void restore() },
    ]);
  };

  return { state, chooseFile, confirmRestore };
}
