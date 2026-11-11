import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { getSpeechLocale, type VoiceLanguage } from '@/i18n/languages';

import { getSpeechRecognitionService } from '../engine';

/**
 * Voice-screen recording state. The microphone never outlives the screen: the session is
 * cancelled when the screen loses focus (tab switch, navigation), unmounts, or the app
 * goes to the background.
 */
export function useVoiceRecorder(language: VoiceLanguage) {
  const service = getSpeechRecognitionService();
  const state = useSyncExternalStore(service.subscribe, service.getState);
  const elapsedSeconds = useElapsedSeconds(state.status === 'listening' ? state.startedAt : null);

  useFocusEffect(
    useCallback(() => {
      return () => service.cancel();
    }, [service]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') service.cancel();
    });
    return () => {
      subscription.remove();
      service.cancel();
    };
  }, [service]);

  const start = () => void service.start(getSpeechLocale(language));

  return {
    state,
    elapsedSeconds,
    start,
    stop: service.stop,
    cancel: service.cancel,
    retry: () => {
      service.cancel();
      start();
    },
  };
}

function useElapsedSeconds(startedAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [startedAt]);
  return startedAt === null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000));
}
