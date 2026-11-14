import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';

import { useReceiptDraftStore } from '@/store/receiptDraftStore';
import { useSettingsStore } from '@/store/settingsStore';

import { createReceiptDraft, type ReceiptDraft } from '../draft';
import {
  ReceiptImageError,
  receiptImageProcessor,
  type ImageErrorCode,
  type PickResult,
} from '../image/receiptImageProcessor';
import { getReceiptOcrProvider } from '../ocr';
import { OcrError, type OcrErrorCode } from '../ocr/types';
import type { ParsedReceipt } from '../types';
import {
  loadStoredReceiptDraft,
  startReceiptDraftPersistence,
} from '../services/receiptDraftPersistence';
import { receiptImageStore } from '../services/receiptImageStore';
import { receiptScannerService, type ScanStage } from '../services/receiptScannerService';
import { receiptService } from '../services/receiptService';

export type ScanErrorCode =
  Exclude<OcrErrorCode, 'cancelled'> | ImageErrorCode | 'cameraDenied' | 'storage';

export type ScanState =
  | { kind: 'choose' }
  | { kind: 'preview'; uri: string }
  | { kind: 'processing'; stage: 'preparing' | ScanStage }
  | { kind: 'error'; code: ScanErrorCode; canAskAgain?: boolean; imageFile: string | null };

/** Draft id: also the save key and the photo's file name. */
function newDraftId(): string {
  return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Scan flow: choose source → preview (rotate / retake) → prepare + read on-device → open the
 * review screen with a draft. Nothing is saved to the database here. Every failure offers
 * manual entry, keeping the photo when there is one.
 */
export function useReceiptScan() {
  const currency = useSettingsStore((s) => s.currency);
  const setDraft = useReceiptDraftStore((s) => s.setDraft);
  const clearDraft = useReceiptDraftStore((s) => s.clearDraft);
  const [state, setState] = useState<ScanState>({ kind: 'choose' });
  const [stored, setStored] = useState<ReceiptDraft | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    startReceiptDraftPersistence();
    let active = true;
    const inMemory = useReceiptDraftStore.getState().draft;
    void (async () => {
      const draft = inMemory ?? (await loadStoredReceiptDraft());
      if (!active) return;
      setStored(draft);
      // Photos of cancelled or failed scans are removed; the open draft's photo is kept.
      void receiptService.sweepOrphanImages(draft?.imageFile ?? null);
    })();
    return () => {
      active = false;
      abort.current?.abort();
    };
  }, []);

  const handlePick = (result: PickResult) => {
    if (result.status === 'picked') setState({ kind: 'preview', uri: result.uri });
    else if (result.status === 'denied') {
      setState({
        kind: 'error',
        code: 'cameraDenied',
        canAskAgain: result.canAskAgain,
        imageFile: null,
      });
    }
  };

  const run = async (task: () => Promise<PickResult>) => {
    try {
      handlePick(await task());
    } catch (error) {
      const code = error instanceof ReceiptImageError ? error.code : 'invalidImage';
      setState({ kind: 'error', code, imageFile: null });
    }
  };

  const openReview = (
    imageFile: string | null,
    parsed: ParsedReceipt | null,
    provider: string | null,
    id: string,
  ) => {
    setDraft(
      createReceiptDraft({
        id,
        imageFile,
        parsed,
        ocrProvider: provider,
        currency,
        today: new Date(),
      }),
    );
    router.replace('/receipt/review');
  };

  const processPhoto = async (uri: string) => {
    const id = newDraftId();
    setState({ kind: 'processing', stage: 'preparing' });
    let prepared: string;
    try {
      prepared = await receiptImageProcessor.normalize(uri);
    } catch (error) {
      const code = error instanceof ReceiptImageError ? error.code : 'invalidImage';
      setState({ kind: 'error', code, imageFile: null });
      return;
    }
    let imageFile: string;
    try {
      imageFile = await receiptImageStore.saveDraftImage(prepared, id);
    } catch {
      setState({ kind: 'error', code: 'storage', imageFile: null });
      return;
    }
    const controller = new AbortController();
    abort.current = controller;
    try {
      const result = await receiptScannerService.scan(
        receiptImageStore.uriOf(imageFile) ?? prepared,
        {
          provider: getReceiptOcrProvider(),
          today: new Date(),
          signal: controller.signal,
          onStage: (stage) => setState({ kind: 'processing', stage }),
        },
      );
      openReview(imageFile, result.parsed, result.ocrProvider, id);
    } catch (error) {
      const code = error instanceof OcrError ? error.code : 'failed';
      // Not an OCR error: the parser or opening the review threw. Log the error object only.
      if (!(error instanceof OcrError)) console.warn('Receipt scan step failed', error);
      if (code === 'cancelled') {
        receiptImageStore.delete(imageFile);
        setState({ kind: 'preview', uri });
      } else {
        setState({ kind: 'error', code, imageFile });
      }
    } finally {
      abort.current = null;
    }
  };

  return {
    state,
    storedDraft: stored,
    takePhoto: () => run(() => receiptImageProcessor.capture()),
    choosePhoto: () => run(() => receiptImageProcessor.pick()),
    rotate: async (degrees: 90 | -90) => {
      if (state.kind !== 'preview') return;
      try {
        setState({ kind: 'preview', uri: await receiptImageProcessor.rotate(state.uri, degrees) });
      } catch {
        setState({ kind: 'error', code: 'invalidImage', imageFile: null });
      }
    },
    retake: () => setState({ kind: 'choose' }),
    confirmPhoto: () => (state.kind === 'preview' ? processPhoto(state.uri) : undefined),
    cancelProcessing: () => abort.current?.abort(),
    /** Review with empty fields; keeps the photo of a scan that could not be read. */
    enterManually: () => {
      const imageFile = state.kind === 'error' ? state.imageFile : null;
      openReview(imageFile, null, null, imageFile ? imageFile.replace(/\.jpg$/, '') : newDraftId());
    },
    tryAgain: () => setState({ kind: 'choose' }),
    openSettings: () => void Linking.openSettings(),
    resume: () => {
      if (!stored) return;
      setDraft(stored);
      router.replace('/receipt/review');
    },
    discardStored: () => {
      clearDraft();
      receiptImageStore.clearDraft();
      receiptImageStore.delete(stored?.imageFile ?? null);
      setStored(null);
    },
  };
}
