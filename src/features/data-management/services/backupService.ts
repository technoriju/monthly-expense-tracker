import { dataRepository } from '@/database';
import { getAppInfo } from '@/features/settings/appInfo';
import { useSettingsStore } from '@/store/settingsStore';

import {
  BACKUP_MIME_TYPE,
  backupFileName,
  createBackupDocument,
  serializeBackup,
} from '../backupFormat';
import {
  localBackupProvider,
  type BackupDestination,
  type BackupFile,
  type SaveOutcome,
} from '../providers';

export const backupService = {
  /** Builds the complete versioned JSON backup of the current data and preferences. */
  async createBackupFile(now: Date = new Date()): Promise<BackupFile> {
    const snapshot = await dataRepository.exportSnapshot();
    const { uiLanguage, voiceLanguage, themeMode, currency } = useSettingsStore.getState();
    const doc = createBackupDocument(
      snapshot,
      { uiLanguage, voiceLanguage, themeMode, currency },
      { appVersion: getAppInfo().version, exportedAt: now },
    );
    return {
      name: backupFileName(now),
      contents: serializeBackup(doc),
      mimeType: BACKUP_MIME_TYPE,
    };
  },

  /** Creates a backup and hands it to the user-chosen destination. Never uploads. */
  async exportBackup(destination: BackupDestination): Promise<SaveOutcome> {
    return localBackupProvider.save(await this.createBackupFile(), destination);
  },
};
