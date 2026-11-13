import { getReceiptOcrProvider } from '../ocr';
import { OcrError, type OcrResult, type ReceiptOCRProvider } from '../ocr/types';
import { lines, PRINTED_RESTAURANT } from '../parser/__fixtures__/receiptFixtures';
import { receiptScannerService } from '../services/receiptScannerService';

const TODAY = new Date(2025, 4, 22);

function provider(processImage: () => Promise<OcrResult>, available = true): ReceiptOCRProvider {
  return { id: 'fake', isAvailable: async () => available, processImage };
}

const result = (text: string): OcrResult => ({
  text,
  lines: lines(text),
  provider: 'fake',
  durationMs: 5,
});

describe('receiptScannerService.scan', () => {
  it('reads and parses a receipt, reporting progress stages', async () => {
    const stages: string[] = [];
    const scan = await receiptScannerService.scan('file:///r.jpg', {
      provider: provider(async () => result(PRINTED_RESTAURANT)),
      today: TODAY,
      onStage: (s) => stages.push(s),
    });
    expect(stages).toEqual(['reading', 'analysing']);
    expect(scan.ocrProvider).toBe('fake');
    expect(scan.parsed.grandTotalMinor).toBe(39800);
  });

  it('reports an unavailable engine (Expo Go / no OCR module) so manual entry is offered', async () => {
    await expect(
      receiptScannerService.scan('file:///r.jpg', {
        provider: getReceiptOcrProvider(),
        today: TODAY,
      }),
    ).rejects.toEqual(new OcrError('unavailable'));
  });

  it('maps engine failures to "failed"', async () => {
    await expect(
      receiptScannerService.scan('file:///r.jpg', {
        provider: provider(async () => {
          throw new Error('native crash');
        }),
        today: TODAY,
      }),
    ).rejects.toEqual(new OcrError('failed'));
  });

  it('gives up after the timeout', async () => {
    await expect(
      receiptScannerService.scan('file:///r.jpg', {
        provider: provider(() => new Promise(() => {})),
        today: TODAY,
        timeoutMs: 10,
      }),
    ).rejects.toEqual(new OcrError('timeout'));
  });

  it('stops waiting when cancelled and ignores the late result', async () => {
    const controller = new AbortController();
    let finish: (r: OcrResult) => void = () => {};
    const pending = receiptScannerService.scan('file:///r.jpg', {
      provider: provider(() => new Promise((resolve) => (finish = resolve))),
      today: TODAY,
      signal: controller.signal,
    });
    await Promise.resolve();
    controller.abort();
    finish(result(PRINTED_RESTAURANT));
    await expect(pending).rejects.toEqual(new OcrError('cancelled'));
  });

  it('returns an empty draft, not an error, when no text is readable', async () => {
    const scan = await receiptScannerService.scan('file:///r.jpg', {
      provider: provider(async () => result('')),
      today: TODAY,
    });
    expect(scan.parsed.flags).toContain('noText');
  });
});
