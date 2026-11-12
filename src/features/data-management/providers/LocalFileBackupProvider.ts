import { Directory, File, Paths, type PickSingleFileResult } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type {
  BackupDestination,
  BackupFile,
  BackupProvider,
  PickedBackup,
  SaveOutcome,
} from './BackupProvider';

/** Prefix of backup files written to the app cache before sharing. */
const CACHE_PREFIX = 'expense-tracker-backup_';

/** Native picker rejection when the user closes it (Android / iOS codes). */
function isPickerCancel(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' && code.includes('CANCEL');
}

/** Removes earlier shared backups from the app's private cache. */
function clearCachedBackups(): void {
  for (const entry of Paths.cache.list()) {
    if (entry instanceof File && entry.name.startsWith(CACHE_PREFIX)) {
      try {
        entry.delete();
      } catch {
        // Best effort: a leftover file stays in the app-private cache.
      }
    }
  }
}

/**
 * Files on the device, chosen by the user through system UI: the share sheet (where Files,
 * Drive or any other app the user picks may receive it) or the system folder picker. The app
 * itself never uploads anything.
 */
export class LocalFileBackupProvider implements BackupProvider {
  readonly id = 'localFile' as const;
  readonly enabled = true;

  async save(file: BackupFile, destination: BackupDestination): Promise<SaveOutcome> {
    return destination === 'share' ? this.share(file) : this.saveToFolder(file);
  }

  private async share(file: BackupFile): Promise<SaveOutcome> {
    if (!(await Sharing.isAvailableAsync())) return 'unavailable';
    clearCachedBackups();
    const cached = new File(Paths.cache, file.name);
    cached.create({ overwrite: true });
    cached.write(file.contents);
    await Sharing.shareAsync(cached.uri, {
      mimeType: file.mimeType,
      UTI: 'public.json',
    });
    return 'saved';
  }

  private async saveToFolder(file: BackupFile): Promise<SaveOutcome> {
    let directory: Directory;
    try {
      directory = await Directory.pickDirectoryAsync();
    } catch (error) {
      if (isPickerCancel(error)) return 'cancelled';
      throw error;
    }
    const target = directory.createFile(file.name, file.mimeType);
    target.write(file.contents);
    return 'saved';
  }

  async pick(): Promise<PickedBackup | null> {
    let result: PickSingleFileResult;
    try {
      // Some file managers label JSON as octet-stream or plain text; validation decides.
      result = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/*', '*/*'] });
    } catch (error) {
      if (isPickerCancel(error)) return null;
      throw error;
    }
    if (result.canceled) return null;
    return { name: result.result.name, contents: await result.result.text() };
  }
}
