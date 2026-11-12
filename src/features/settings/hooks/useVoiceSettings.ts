import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';

import { getSpeechEngine } from '@/features/voice/engine';
import {
  checkVoiceCapabilities,
  type VoiceCapabilities,
} from '@/features/voice/engine/voiceCapabilities';
import { useVoiceLanguage } from '@/features/voice/hooks/useVoiceLanguage';
import { getSpeechLocale, VOICE_LANGUAGES } from '@/i18n/languages';

/** Voice language preference + live speech-recognition status for that language. */
export function useVoiceSettings() {
  const { voiceLanguage, setVoiceLanguage } = useVoiceLanguage();
  const [checkCount, setCheckCount] = useState(0);
  // Results are tagged with the check they belong to; a stale or pending check reads as null.
  const checkKey = `${voiceLanguage}:${checkCount}`;
  const [result, setResult] = useState<{ key: string; value: VoiceCapabilities } | null>(null);
  const capabilities = result?.key === checkKey ? result.value : null;

  useEffect(() => {
    let cancelled = false;
    const done = (value: VoiceCapabilities) => {
      if (!cancelled) setResult({ key: checkKey, value });
    };
    checkVoiceCapabilities(getSpeechEngine(), getSpeechLocale(voiceLanguage))
      .then(done)
      .catch((error: unknown) => {
        console.warn('Voice capability check failed', error);
        done({ available: false, permission: null, localeSupport: null });
      });
    return () => {
      cancelled = true;
    };
  }, [voiceLanguage, checkKey]);

  const recheck = useCallback(() => setCheckCount((n) => n + 1), []);

  const requestPermission = useCallback(async () => {
    await getSpeechEngine().requestPermission();
    recheck();
  }, [recheck]);

  const openSystemSettings = useCallback(() => {
    void Linking.openSettings();
  }, []);

  return {
    voiceLanguage,
    options: VOICE_LANGUAGES,
    setVoiceLanguage,
    capabilities,
    recheck,
    requestPermission,
    openSystemSettings,
  };
}
