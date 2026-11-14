import { create } from 'zustand';

/** `pending` until the consent flow finishes; `unavailable` means no ads this session. */
export type AdsStatus = 'pending' | 'ready' | 'unavailable';

interface AdsStore {
  status: AdsStatus;
  /** True when the consent SDK requires an "Ad privacy options" entry point (e.g. EEA/UK). */
  privacyOptionsRequired: boolean;
  setStatus(status: AdsStatus): void;
  setPrivacyOptionsRequired(required: boolean): void;
}

/** Ephemeral ads state. Nothing here is persisted. */
export const useAdsStore = create<AdsStore>()((set) => ({
  status: 'pending',
  privacyOptionsRequired: false,
  setStatus: (status) => set({ status }),
  setPrivacyOptionsRequired: (privacyOptionsRequired) => set({ privacyOptionsRequired }),
}));
