import { startOfMonth } from 'date-fns';
import { create } from 'zustand';

export type ToastTone = 'success' | 'error';

export interface Toast {
  id: number;
  /** Already-translated message. */
  message: string;
  tone: ToastTone;
}

interface UiStore {
  /** First day of the month shown on the dashboard. */
  selectedMonth: Date;
  /** Bumped after every data write so data hooks refetch (ARCHITECTURE.md §4.5). */
  dataVersion: number;
  toast: Toast | null;
  setSelectedMonth(month: Date): void;
  bumpDataVersion(): void;
  showToast(message: string, tone?: ToastTone): void;
  hideToast(id: number): void;
}

let nextToastId = 1;

/** Ephemeral UI state. DB rows are never mirrored here. */
export const useUiStore = create<UiStore>()((set) => ({
  selectedMonth: startOfMonth(new Date()),
  dataVersion: 0,
  toast: null,
  setSelectedMonth: (month) => set({ selectedMonth: startOfMonth(month) }),
  bumpDataVersion: () => set((s) => ({ dataVersion: s.dataVersion + 1 })),
  showToast: (message, tone = 'success') => set({ toast: { id: nextToastId++, message, tone } }),
  hideToast: (id) => set((s) => (s.toast?.id === id ? { toast: null } : s)),
}));
