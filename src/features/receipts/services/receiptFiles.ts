import { useReceiptDraftStore } from '@/store/receiptDraftStore';

import { receiptImageStore } from './receiptImageStore';

/**
 * Removes every receipt photo and the unsaved review draft. Used after "Clear all data" and
 * restore have committed (backups hold no receipts). File errors are logged, never thrown:
 * the database change already succeeded, and leftovers are swept on the next scan.
 */
export function deleteAllReceiptFiles(): void {
  useReceiptDraftStore.getState().clearDraft();
  try {
    receiptImageStore.deleteAll();
  } catch (error) {
    console.warn('Receipt files cleanup failed', error);
  }
}
