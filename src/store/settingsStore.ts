import { create } from 'zustand';

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
  applySettings: (patch) => set(patch),
}));
