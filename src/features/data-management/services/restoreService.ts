import { getLocales } from 'expo-localization';

import { dataRepository } from '@/database';
import { settingsService } from '@/features/settings/services/settingsService';
import { useUiStore } from '@/store/uiStore';
import { useVoiceDraftStore } from '@/store/voiceDraftStore';

import type { BackupDocument } from '../backupFormat';
import { parseBackup, type BackupErrorCode } from '../backupValidation';
import { localBackupProvider } from '../providers';
import type { DataCounts } from '../types';

export type PickBackupResult =
  | { status: 'cancelled' }
  | { status: 'invalid'; error: BackupErrorCode }
  | { status: 'valid'; backup: BackupDocument; fileName: string };

export function countBackup(backup: BackupDocument): DataCounts {
  return {
    transactions: backup.transactions.length,
    categories: backup.categories.filter((c) => !c.isArchived).length,
    budgets: backup.budgets.length,
  };
}

export const restoreService = {
  /** Lets the user choose a file and validates it. Nothing is written. */
  async pickBackup(): Promise<PickBackupResult> {
    const picked = await localBackupProvider.pick();
    if (!picked) return { status: 'cancelled' };
    if ('tooLarge' in picked) return { status: 'invalid', error: 'tooLarge' };
    const result = parseBackup(picked.contents);
    if (!result.ok) {
      // Only the error code: the detail can quote record ids or parts of the file.
      console.warn('Backup rejected', result.error);
      return { status: 'invalid', error: result.error };
    }
    return { status: 'valid', backup: result.backup, fileName: picked.name };
  },

  /** Current data, for the "will be replaced" warning. */
  async currentCounts(): Promise<DataCounts> {
    return dataRepository.counts();
  },

  /**
   * Full replacement with a validated backup in one database transaction (all or nothing),
   * then re-applies the restored preferences and refreshes every screen.
   */
  async restore(backup: BackupDocument): Promise<void> {
    const { categories, transactions, budgets, settings } = backup;
    // BackupSettings keys are the persisted setting keys (uiLanguage, voiceLanguage, …).
    await dataRepository.replaceAll({ categories, transactions, budgets }, { ...settings });
    // The data is committed at this point, so a failure below must not report "restore
    // failed": the restored preferences are stored and applied on the next start anyway.
    try {
      await settingsService.hydrate(getLocales().map((l) => l.languageCode));
    } catch (error) {
      console.error('Applying restored preferences failed', error);
    }
    useVoiceDraftStore.getState().clearDraft();
    useUiStore.getState().bumpDataVersion();
  },
};
