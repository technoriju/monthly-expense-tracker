import { create } from 'zustand';

import type { ReceiptDraft } from '@/features/receipts/draft';

interface ReceiptDraftStore {
  /** Receipt under review. Saved to SQLite only when the user confirms. */
  draft: ReceiptDraft | null;
  setDraft(draft: ReceiptDraft): void;
  /** Applies a user edit and marks the draft as edited. */
  updateDraft(patch: Partial<ReceiptDraft>): void;
  clearDraft(): void;
}

export const useReceiptDraftStore = create<ReceiptDraftStore>()((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  updateDraft: (patch) =>
    set((s) => (s.draft ? { draft: { ...s.draft, ...patch, edited: true } } : s)),
  clearDraft: () => set({ draft: null }),
}));
