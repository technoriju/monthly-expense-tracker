/**
 * Where a backup file goes and where it is read back from. The backup/restore services work
 * only through this interface, so another destination (e.g. Google Drive) can be added later
 * without touching backup generation, validation or the database restore.
 */

export type BackupProviderId = 'localFile' | 'googleDrive';

export interface BackupFile {
  name: string;
  /** UTF-8 JSON text. */
  contents: string;
  mimeType: string;
}

/** `share` = system share sheet; `folder` = system folder picker, then write the file there. */
export type BackupDestination = 'share' | 'folder';

export type SaveOutcome = 'saved' | 'cancelled' | 'unavailable';

/** A chosen file: its text, or `tooLarge` when it was not read because of its size. */
export type PickedBackup = { name: string; contents: string } | { name: string; tooLarge: true };

export interface BackupProvider {
  readonly id: BackupProviderId;
  /** Disabled providers are never offered in the UI. */
  readonly enabled: boolean;
  save(file: BackupFile, destination: BackupDestination): Promise<SaveOutcome>;
  /** Lets the user choose a backup file. `null` when cancelled. */
  pick(): Promise<PickedBackup | null>;
}

export class BackupProviderUnavailableError extends Error {
  constructor(id: BackupProviderId) {
    super(`Backup provider "${id}" is not available.`);
    this.name = 'BackupProviderUnavailableError';
  }
}
