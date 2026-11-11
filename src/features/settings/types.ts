/** Persisted setting keys (ARCHITECTURE.md §4.2). Only keys used so far are listed. */
export const SETTING_KEYS = {
  uiLanguage: 'uiLanguage',
  currency: 'currency',
  themeMode: 'themeMode',
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];
