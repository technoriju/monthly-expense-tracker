import { settingsService } from '@/features/settings/services/settingsService';
import type { VoiceLanguage } from '@/i18n/languages';
import { useSettingsStore } from '@/store/settingsStore';

/** Persisted voice-recognition language. Changing it never changes the UI language. */
export function useVoiceLanguage() {
  const voiceLanguage = useSettingsStore((s) => s.voiceLanguage);
  const setVoiceLanguage = (code: VoiceLanguage) => {
    settingsService.setVoiceLanguage(code).catch((error: unknown) => {
      console.error('Saving voice language failed', error);
    });
  };
  return { voiceLanguage, setVoiceLanguage };
}
