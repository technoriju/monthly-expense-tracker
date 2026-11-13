import { Directory, File, Paths } from 'expo-file-system';

/**
 * App-private folder for receipt photos and the unsaved review draft. Files stay on the
 * device: not in SQLite (only the file name is stored), not in backups, never uploaded.
 * File names, not full paths, are stored because the app container path can change.
 */
const DRAFT_FILE = 'draft.json';

function directory(): Directory {
  return new Directory(Paths.document, 'receipts');
}

function ensureDirectory(): Directory {
  const dir = directory();
  dir.create({ idempotent: true, intermediates: true });
  return dir;
}

/** Only names this store creates; anything else is never resolved or deleted. */
function isSafeName(name: string): boolean {
  return /^[A-Za-z0-9_-]{1,64}\.jpg$/.test(name);
}

export const receiptImageStore = {
  /** Copies a processed photo into app storage as `<draftId>.jpg`; returns the file name. */
  async saveDraftImage(sourceUri: string, draftId: string): Promise<string> {
    const name = `${draftId}.jpg`;
    if (!isSafeName(name)) throw new Error('Invalid receipt image name');
    const target = new File(ensureDirectory(), name);
    if (target.exists) target.delete();
    await new File(sourceUri).copy(target);
    return name;
  },

  /** URI of a stored image, or null when it is missing (deleted, storage cleared). */
  uriOf(name: string | null): string | null {
    if (name === null || !isSafeName(name)) return null;
    const file = new File(directory(), name);
    return file.exists ? file.uri : null;
  },

  /** Deletes one image; missing files are ignored. */
  delete(name: string | null): void {
    if (name === null || !isSafeName(name)) return;
    const file = new File(directory(), name);
    if (file.exists) file.delete();
  },

  /** Deletes every receipt image and the draft (restore / clear all data). */
  deleteAll(): void {
    const dir = directory();
    if (dir.exists) dir.delete();
  },

  /** Deletes images no saved receipt or open draft refers to (left by failed or cancelled scans). */
  sweep(keep: ReadonlySet<string>): void {
    const dir = directory();
    if (!dir.exists) return;
    for (const entry of dir.list()) {
      if (entry instanceof File && isSafeName(entry.name) && !keep.has(entry.name)) {
        entry.delete();
      }
    }
  },

  /** Unsaved review draft (JSON), so edits survive the app closing. */
  async writeDraft(json: string): Promise<void> {
    await new File(ensureDirectory(), DRAFT_FILE).write(json);
  },

  async readDraft(): Promise<string | null> {
    const file = new File(directory(), DRAFT_FILE);
    return file.exists ? file.text() : null;
  },

  clearDraft(): void {
    const file = new File(directory(), DRAFT_FILE);
    if (file.exists) file.delete();
  },
};
