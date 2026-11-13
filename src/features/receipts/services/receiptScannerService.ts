import { OcrError, type OcrResult, type ReceiptOCRProvider } from '../ocr/types';
import { parseReceipt } from '../parser/receiptParser';
import type { ParsedReceipt } from '../types';

export const OCR_TIMEOUT_MS = 30_000;

export type ScanStage = 'reading' | 'analysing';

export interface ScanOptions {
  provider: ReceiptOCRProvider;
  today: Date;
  /** Abort to stop waiting; a late OCR result is then ignored. */
  signal?: AbortSignal;
  timeoutMs?: number;
  onStage?: (stage: ScanStage) => void;
}

export interface ScanResult {
  parsed: ParsedReceipt;
  ocrProvider: string;
}

/**
 * Waits for the OCR promise, but gives up on timeout or cancellation. Native recognition
 * cannot be interrupted, so its late result is simply dropped.
 */
function withTimeout(
  work: Promise<OcrResult>,
  timeoutMs: number,
  signal: AbortSignal | undefined,
): Promise<OcrResult> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new OcrError('cancelled'));
      return;
    }
    const onAbort = () => finish(() => reject(new OcrError('cancelled')));
    const timer = setTimeout(() => finish(() => reject(new OcrError('timeout'))), timeoutMs);
    let done = false;
    function finish(action: () => void) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      action();
    }
    signal?.addEventListener('abort', onAbort);
    work.then(
      (result) => finish(() => resolve(result)),
      (error: unknown) =>
        finish(() => reject(error instanceof OcrError ? error : new OcrError('failed'))),
    );
  });
}

export const receiptScannerService = {
  /**
   * Reads a prepared receipt photo on-device and parses it into a draft for review. Nothing
   * is saved here. Throws `OcrError` (unavailable / failed / timeout / cancelled); an empty or
   * unreadable receipt is not an error — the parsed result carries `noText` / `totalMissing`.
   */
  async scan(imageUri: string, options: ScanOptions): Promise<ScanResult> {
    const { provider, today, signal, timeoutMs = OCR_TIMEOUT_MS, onStage } = options;
    if (!(await provider.isAvailable())) throw new OcrError('unavailable');
    onStage?.('reading');
    const ocr = await withTimeout(provider.processImage(imageUri), timeoutMs, signal);
    if (signal?.aborted) throw new OcrError('cancelled');
    onStage?.('analysing');
    return { parsed: parseReceipt(ocr.lines, { today }), ocrProvider: ocr.provider };
  },
};
