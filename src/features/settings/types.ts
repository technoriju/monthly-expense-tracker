/** Persisted setting keys (ARCHITECTURE.md §4.2). Only keys used so far are listed. */
export const SETTING_KEYS = {
  uiLanguage: 'uiLanguage',
  currency: 'currency',
  themeMode: 'themeMode',
  voiceLanguage: 'voiceLanguage',
  onboardingDone: 'onboardingDone',
  appLockMethod: 'appLockMethod',
  profileName: 'profileName',
  // Device-only app-update state (not in backups; see features/app-update).
  updatePolicyCache: 'updatePolicyCache',
  updateDismissedVersion: 'updateDismissedVersion',
} as const;

/** Longest greeting name kept. */
export const PROFILE_NAME_MAX_LENGTH = 30;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];
