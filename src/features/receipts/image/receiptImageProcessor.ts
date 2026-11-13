import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

/** Longest side kept for OCR: enough detail for receipt text, small enough for memory. */
export const MAX_IMAGE_EDGE = 2000;
/** Shorter than this, receipt text is too small to read. */
export const MIN_IMAGE_EDGE = 600;
/** Larger source files are refused before decoding. */
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

export type ImageErrorCode = 'tooSmall' | 'tooLarge' | 'invalidImage';

export class ReceiptImageError extends Error {
  constructor(readonly code: ImageErrorCode) {
    super(`Receipt image error: ${code}`);
    this.name = 'ReceiptImageError';
  }
}

export type PickResult =
  | { status: 'picked'; uri: string }
  | { status: 'cancelled' }
  | { status: 'denied'; canAskAgain: boolean };

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  // Android offers free-form crop and rotate; iOS can only crop to a square, so it is skipped
  // there and the in-app rotate buttons are the fallback.
  allowsEditing: Platform.OS === 'android',
  quality: 1,
  exif: false,
};

function fromPicker(result: ImagePicker.ImagePickerResult): PickResult {
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return { status: 'cancelled' };
  if (asset.fileSize !== undefined && asset.fileSize > MAX_SOURCE_BYTES) {
    throw new ReceiptImageError('tooLarge');
  }
  return { status: 'picked', uri: asset.uri };
}

/**
 * Camera / gallery capture, rotation and normalization of receipt photos. Everything runs on
 * the device. No perspective or contrast correction (not available in Expo modules); the
 * user crops on Android and can rotate in the app.
 */
export const receiptImageProcessor = {
  async capture(): Promise<PickResult> {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { status: 'denied', canAskAgain: permission.canAskAgain };
    return fromPicker(await ImagePicker.launchCameraAsync(PICKER_OPTIONS));
  },

  /** The system photo picker needs no permission on current Android and iOS. */
  async pick(): Promise<PickResult> {
    return fromPicker(await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS));
  },

  /** Rotates by ±90° steps; returns a new cache file. */
  async rotate(uri: string, degrees: 90 | -90): Promise<string> {
    try {
      const image = await ImageManipulator.manipulate(uri).rotate(degrees).renderAsync();
      const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.95 });
      return saved.uri;
    } catch {
      throw new ReceiptImageError('invalidImage');
    }
  },

  /**
   * Prepares a photo for OCR: refuses tiny images, scales the longest side down to
   * MAX_IMAGE_EDGE and saves a JPEG in the cache.
   */
  async normalize(uri: string): Promise<string> {
    let context;
    let image;
    try {
      context = ImageManipulator.manipulate(uri);
      image = await context.renderAsync();
    } catch {
      throw new ReceiptImageError('invalidImage');
    }
    const { width, height } = image;
    if (!width || !height) throw new ReceiptImageError('invalidImage');
    if (Math.min(width, height) < MIN_IMAGE_EDGE) throw new ReceiptImageError('tooSmall');
    try {
      if (Math.max(width, height) > MAX_IMAGE_EDGE) {
        context.resize(width >= height ? { width: MAX_IMAGE_EDGE } : { height: MAX_IMAGE_EDGE });
        image = await context.renderAsync();
      }
      const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
      return saved.uri;
    } catch {
      throw new ReceiptImageError('invalidImage');
    }
  },
};
