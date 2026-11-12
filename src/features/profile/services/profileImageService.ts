import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

/**
 * App-private folder holding the single profile photo. It stays on the device: not in the
 * database, not in backups, never uploaded.
 */
function profileDirectory(): Directory {
  return new Directory(Paths.document, 'profile');
}

export const profileImageService = {
  /** URI of the saved profile photo, or `null` when none is set. */
  getUri(): string | null {
    const directory = profileDirectory();
    if (!directory.exists) return null;
    const photo = directory.list().find((entry) => entry instanceof File);
    return photo?.uri ?? null;
  },

  /**
   * Opens the system photo picker with a square crop and copies the result into app storage,
   * replacing the previous photo. Returns the new URI, or `null` when the user cancelled.
   */
  async pick(): Promise<string | null> {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      shape: 'oval',
      quality: 0.8,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return null;

    const directory = profileDirectory();
    directory.create({ idempotent: true });
    // A new name each time so the image cache never shows the previous photo.
    const target = new File(directory, `photo-${Date.now()}.jpg`);
    await new File(asset.uri).copy(target);
    for (const entry of directory.list()) {
      if (entry.uri !== target.uri) entry.delete();
    }
    return target.uri;
  },

  /** Deletes the saved profile photo, if any. */
  remove(): void {
    const directory = profileDirectory();
    if (directory.exists) directory.delete();
  },
};
