import { createMlKitReceiptOcrProvider } from './MlKitReceiptOCRProvider';
import type { ReceiptOCRProvider } from './types';

let provider: ReceiptOCRProvider | null = null;

/**
 * The active OCR engine (on-device only). Change here to swap providers; parsing does not
 * depend on it. A provider that uploads images needs the user's explicit approval first.
 */
export function getReceiptOcrProvider(): ReceiptOCRProvider {
  provider ??= createMlKitReceiptOcrProvider();
  return provider;
}

export * from './types';
