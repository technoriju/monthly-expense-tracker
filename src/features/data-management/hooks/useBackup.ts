import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useUiStore } from '@/store/uiStore';

import type { BackupDestination } from '../providers';
import { backupService } from '../services/backupService';

/** Creates a backup and sends it to the chosen destination, with toast feedback. */
export function useBackup() {
  const { t } = useTranslation('dataManagement');
  const showToast = useUiStore((s) => s.showToast);
  const [busy, setBusy] = useState<BackupDestination | null>(null);

  const exportBackup = async (destination: BackupDestination) => {
    if (busy) return;
    setBusy(destination);
    try {
      const outcome = await backupService.exportBackup(destination);
      if (outcome === 'unavailable') showToast(t('backup.unavailable'), 'error');
      else if (outcome === 'saved') {
        showToast(destination === 'folder' ? t('backup.savedToFolder') : t('backup.success'));
      }
    } catch (error) {
      console.error('Backup failed', error);
      showToast(t('backup.failed'), 'error');
    } finally {
      setBusy(null);
    }
  };

  return { exportBackup, busy };
}
