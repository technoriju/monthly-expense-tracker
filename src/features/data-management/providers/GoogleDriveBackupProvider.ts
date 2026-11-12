import {
  BackupProviderUnavailableError,
  type BackupFile,
  type BackupProvider,
  type PickedBackup,
  type SaveOutcome,
} from './BackupProvider';

/**
 * PLACEHOLDER — intentionally disabled. Not registered in the UI.
 *
 * Google Drive API policy restricts backing up application content without express prior
 * written consent. Until that authorization is obtained this provider must stay disabled:
 * no Google OAuth dependency, no Drive permission request, no stored tokens, no automatic
 * sync. Users can already save a backup to Drive themselves via the share sheet / folder
 * picker of `LocalFileBackupProvider`.
 *
 * A future implementation (only after the policy requirements are resolved) should add:
 * user authorization and disconnect, secure token storage, upload, list backup metadata,
 * download + restore through the same `parseBackup` → `restoreService` path, and upload /
 * restore error handling. Local backup and restore must keep working when Drive is
 * unavailable.
 */
export class GoogleDriveBackupProvider implements BackupProvider {
  readonly id = 'googleDrive' as const;
  readonly enabled = false;

  async save(_file: BackupFile): Promise<SaveOutcome> {
    throw new BackupProviderUnavailableError(this.id);
  }

  async pick(): Promise<PickedBackup | null> {
    throw new BackupProviderUnavailableError(this.id);
  }
}
