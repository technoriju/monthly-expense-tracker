import { settingsRepository } from '@/database';
import { isAppLockMethod, type AppLockMethod } from '@/features/security/types';
import { changeUiLanguage } from '@/i18n';
import {
  DEFAULT_VOICE_LANGUAGE,
  isSelectableLanguage,
  isVoiceLanguage,
  resolveInitialLanguage,
  type LanguageCode,
  type VoiceLanguage,
} from '@/i18n/languages';
import { useSettingsStore } from '@/store/settingsStore';
import { isThemeMode, type ThemeMode } from '@/theme/theme';
import { DEFAULT_CURRENCY, isCurrencyCode } from '@/utils/money';

import { PROFILE_NAME_MAX_LENGTH, SETTING_KEYS } from '../types';

export const settingsService = {
  /**
   * Loads persisted settings into the store and applies the UI language.
   * Falls back to the device language, then English, when nothing is saved.
   */
  async hydrate(deviceLanguageCodes: readonly (string | null)[]): Promise<void> {
    const stored = await settingsRepository.getAll();
    const storedCurrency = stored[SETTING_KEYS.currency];
    const storedThemeMode = stored[SETTING_KEYS.themeMode];

    const uiLanguage = resolveInitialLanguage(stored[SETTING_KEYS.uiLanguage], deviceLanguageCodes);
    const currency = isCurrencyCode(storedCurrency) ? storedCurrency : DEFAULT_CURRENCY;
    const themeMode = isThemeMode(storedThemeMode) ? storedThemeMode : 'system';
    const storedVoiceLanguage = stored[SETTING_KEYS.voiceLanguage];
    const voiceLanguage = isVoiceLanguage(storedVoiceLanguage)
      ? storedVoiceLanguage
      : isVoiceLanguage(uiLanguage)
        ? uiLanguage
        : DEFAULT_VOICE_LANGUAGE;
    const onboardingDone = stored[SETTING_KEYS.onboardingDone] === true;
    const storedAppLock = stored[SETTING_KEYS.appLockMethod];
    const appLockMethod = isAppLockMethod(storedAppLock) ? storedAppLock : 'off';
    const storedName = stored[SETTING_KEYS.profileName];
    const profileName =
      typeof storedName === 'string' ? storedName.slice(0, PROFILE_NAME_MAX_LENGTH) : '';

    await changeUiLanguage(uiLanguage);
    useSettingsStore.getState().applySettings({
      uiLanguage,
      currency,
      themeMode,
      voiceLanguage,
      onboardingDone,
      appLockMethod,
      profileName,
    });
  },

  /** Persists the UI language (DB first), then switches it live. */
  async setUiLanguage(code: LanguageCode): Promise<void> {
    if (!isSelectableLanguage(code)) {
      throw new Error(`Language "${code}" is not available yet.`);
    }
    await settingsRepository.set(SETTING_KEYS.uiLanguage, code);
    await changeUiLanguage(code);
    useSettingsStore.getState().applySettings({ uiLanguage: code });
  },

  /** Persists the theme preference (DB first), then applies it live. */
  async setThemeMode(mode: ThemeMode): Promise<void> {
    if (!isThemeMode(mode)) {
      throw new Error(`Theme mode "${String(mode)}" is not supported.`);
    }
    await settingsRepository.set(SETTING_KEYS.themeMode, mode);
    useSettingsStore.getState().applySettings({ themeMode: mode });
  },

  /** Persists the voice-recognition language. Never changes the UI language. */
  async setVoiceLanguage(code: VoiceLanguage): Promise<void> {
    if (!isVoiceLanguage(code)) {
      throw new Error(`Voice language "${String(code)}" is not supported.`);
    }
    await settingsRepository.set(SETTING_KEYS.voiceLanguage, code);
    useSettingsStore.getState().applySettings({ voiceLanguage: code });
  },

  /** Marks first-launch onboarding as finished so it never shows again (DB first). */
  async completeOnboarding(): Promise<void> {
    await settingsRepository.set(SETTING_KEYS.onboardingDone, true);
    useSettingsStore.getState().applySettings({ onboardingDone: true });
  },

  /** Persists the app-lock method (DB first). Callers verify the user before changing it. */
  async setAppLockMethod(method: AppLockMethod): Promise<void> {
    if (!isAppLockMethod(method)) {
      throw new Error(`App lock method "${String(method)}" is not supported.`);
    }
    await settingsRepository.set(SETTING_KEYS.appLockMethod, method);
    useSettingsStore.getState().applySettings({ appLockMethod: method });
  },

  /** Persists the greeting name (trimmed, capped; empty clears it). DB first. */
  async setProfileName(name: string): Promise<void> {
    const profileName = name.trim().slice(0, PROFILE_NAME_MAX_LENGTH);
    await settingsRepository.set(SETTING_KEYS.profileName, profileName);
    useSettingsStore.getState().applySettings({ profileName });
  },
};
