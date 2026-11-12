import { create } from 'zustand';

import type { AppLockMethod } from '@/features/security/types';
import {
  DEFAULT_LANGUAGE,
  DEFAULT_VOICE_LANGUAGE,
  type LanguageCode,
  type VoiceLanguage,
} from '@/i18n/languages';
import type { ThemeMode } from '@/theme/theme';
import type { CurrencyCode } from '@/types/money';
import { DEFAULT_CURRENCY } from '@/utils/money';

export interface SettingsState {
  uiLanguage: LanguageCode;
  currency: CurrencyCode;
  themeMode: ThemeMode;
  /** Speech-recognition language. Separate from `uiLanguage`. */
  voiceLanguage: VoiceLanguage;
  /** First-launch onboarding finished (or skipped). Device-only; not part of backups. */
  onboardingDone: boolean;
  /** App lock via the phone's own security. Device-only; not part of backups. */
  appLockMethod: AppLockMethod;
}

interface SettingsStore extends SettingsState {
  /** Updates the in-memory cache. Persisting is the settings service's job (DB first). */
  applySettings(patch: Partial<SettingsState>): void;
}

/** In-memory cache of persisted settings, hydrated from SQLite at startup. */
export const useSettingsStore = create<SettingsStore>()((set) => ({
  uiLanguage: DEFAULT_LANGUAGE,
  currency: DEFAULT_CURRENCY,
  themeMode: 'system',
  voiceLanguage: DEFAULT_VOICE_LANGUAGE,
  onboardingDone: false,
  appLockMethod: 'off',
  applySettings: (patch) => set(patch),
}));
