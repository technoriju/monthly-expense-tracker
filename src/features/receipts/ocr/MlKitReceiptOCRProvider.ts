import { requireOptionalNativeModule } from 'expo';

import { layoutRows } from './layoutRows';
import {
  OcrError,
  type OcrBox,
  type OcrLine,
  type OcrResult,
  type ReceiptOCRProvider,
} from './types';

/** Shape returned by the `expo-mlkit-ocr` native module (ML Kit on Android, Vision on iOS). */
interface NativeBox {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}
interface NativeLine {
  text: string;
  boundingBox?: NativeBox;
}
interface NativeBlock {
  text: string;
  lines?: NativeLine[];
}
interface NativeResult {
  text: string;
  blocks?: NativeBlock[];
}
interface ExpoMlkitOcrModule {
  isSupported(): boolean;
  recognizeText(uri: string): Promise<NativeResult>;
}

function toBox(box: NativeBox | undefined): OcrBox | null {
  if (!box || box.x === undefined || box.y === undefined || !box.width || !box.height) {
    return null;
  }
  return { x: box.x, y: box.y, width: box.width, height: box.height };
}

/** Native result → rows in printed order. The engine reports no confidence, so it stays null. */
export function mapMlKitResult(result: NativeResult): OcrLine[] {
  const lines: OcrLine[] = (result.blocks ?? []).flatMap((block) =>
    (block.lines ?? []).map((line) => ({
      text: line.text,
      confidence: null,
      box: toBox(line.boundingBox),
    })),
  );
  return layoutRows(lines);
}

/**
 * On-device text recognition through `expo-mlkit-ocr`. Images never leave the device.
 * Android uses ML Kit's Latin model: English text and digits 0–9; Bengali or Devanagari
 * script is not read. Loaded optionally: without the native module (Expo Go, or before the
 * package is installed) the provider reports itself unavailable.
 */
export function createMlKitReceiptOcrProvider(): ReceiptOCRProvider {
  const native = () => requireOptionalNativeModule<ExpoMlkitOcrModule>('ExpoMlkitOcr');
  return {
    id: 'mlkit',
    async isAvailable() {
      const module = native();
      try {
        return module !== null && module.isSupported();
      } catch {
        return false;
      }
    },
    async processImage(imageUri) {
      const module = native();
      if (!module) throw new OcrError('unavailable');
      const started = Date.now();
      let result: NativeResult;
      try {
        result = await module.recognizeText(imageUri);
      } catch (error) {
        // Error object only (native code + message) — never the image or recognized text.
        console.warn('On-device OCR failed', error);
        throw new OcrError('failed');
      }
      const lines = mapMlKitResult(result);
      return {
        text: lines.map((l) => l.text).join('\n'),
        lines,
        provider: 'mlkit',
        durationMs: Date.now() - started,
      } satisfies OcrResult;
    },
  };
}
