import { useReceiptDraftStore } from '@/store/receiptDraftStore';

import { parseStoredDraft, type ReceiptDraft } from '../draft';
import { receiptImageStore } from './receiptImageStore';

const WRITE_DELAY_MS = 500;
let timer: ReturnType<typeof setTimeout> | null = null;
let started = false;

function write(draft: ReceiptDraft | null): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    const task = draft
      ? receiptImageStore.writeDraft(JSON.stringify(draft))
      : Promise.resolve(receiptImageStore.clearDraft());
    task.catch((error: unknown) => console.warn('Receipt draft write failed', error));
  }, WRITE_DELAY_MS);
}

/**
 * Mirrors the in-memory draft to `receipts/draft.json` (debounced) so review edits survive
 * the app closing. Started once by the receipt screens.
 */
export function startReceiptDraftPersistence(): void {
  if (started) return;
  started = true;
  useReceiptDraftStore.subscribe((state, previous) => {
    if (state.draft !== previous.draft) write(state.draft);
  });
}

/** The draft left from an earlier session, if any (its photo may be gone — then null image). */
export async function loadStoredReceiptDraft(): Promise<ReceiptDraft | null> {
  try {
    const draft = parseStoredDraft(await receiptImageStore.readDraft());
    if (draft?.imageFile && receiptImageStore.uriOf(draft.imageFile) === null) {
      return { ...draft, imageFile: null };
    }
    return draft;
  } catch (error) {
    console.warn('Receipt draft read failed', error);
    return null;
  }
}
