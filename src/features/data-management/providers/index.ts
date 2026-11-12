import { LocalFileBackupProvider } from './LocalFileBackupProvider';

/**
 * The only active provider. `GoogleDriveBackupProvider` exists as a disabled placeholder and
 * is deliberately not wired in (see its doc comment).
 */
export const localBackupProvider = new LocalFileBackupProvider();

export * from './BackupProvider';
