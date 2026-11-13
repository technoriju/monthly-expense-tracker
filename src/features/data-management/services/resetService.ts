import { dataRepository } from '@/database';
import { deleteAllReceiptFiles } from '@/features/receipts/services/receiptFiles';
import { useUiStore } from '@/store/uiStore';
import { useVoiceDraftStore } from '@/store/voiceDraftStore';

export const resetService = {
  /**
   * Deletes all transactions, budgets and user-created categories; default categories are
   * re-created and preferences are kept. Only called after the user confirmed twice.
   */
  async clearAllData(): Promise<void> {
    await dataRepository.clearUserData();
    deleteAllReceiptFiles();
    useVoiceDraftStore.getState().clearDraft();
    useUiStore.getState().bumpDataVersion();
  },
};
