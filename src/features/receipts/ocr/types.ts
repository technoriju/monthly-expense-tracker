/** Position of recognized text in the image, in image pixels. */
export interface OcrBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** One recognized line of text, in reading order. */
export interface OcrLine {
  text: string;
  /** 0–1 when the engine reports it; `null` when unknown (never invented). */
  confidence: number | null;
  box: OcrBox | null;
}

export interface OcrResult {
  /** Full recognized text, lines separated by `\n`. */
  text: string;
  lines: OcrLine[];
  /** Provider id stored with the receipt (e.g. `mlkit`). */
  provider: string;
  durationMs: number;
}

export type OcrErrorCode = 'unavailable' | 'failed' | 'timeout' | 'cancelled';

export class OcrError extends Error {
  constructor(readonly code: OcrErrorCode) {
    super(`OCR error: ${code}`);
    this.name = 'OcrError';
  }
}

/**
 * Replaceable text-recognition engine. Implementations run on-device; a provider that sends
 * images anywhere must not be added without the user's explicit approval.
 */
export interface ReceiptOCRProvider {
  readonly id: string;
  /** False when the native module is missing (e.g. Expo Go) or the device is unsupported. */
  isAvailable(): Promise<boolean>;
  processImage(imageUri: string): Promise<OcrResult>;
}
