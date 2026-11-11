import { create } from 'zustand';

import type { VoiceExpenseDraft } from '@/features/voice/types';

interface VoiceDraftStore {
  /** Parsed voice expense waiting for review. In memory only — never written to SQLite. */
  draft: VoiceExpenseDraft | null;
  setDraft(draft: VoiceExpenseDraft): void;
  clearDraft(): void;
}

export const useVoiceDraftStore = create<VoiceDraftStore>()((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  clearDraft: () => set({ draft: null }),
}));
