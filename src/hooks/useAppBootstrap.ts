import { useFonts } from 'expo-font';
import { getLocales } from 'expo-localization';
import { useEffect, useState } from 'react';

import { initializeDatabase } from '@/database';
import { settingsService } from '@/features/settings/services/settingsService';
import { FONT_SOURCES } from '@/i18n/fonts';

export type BootstrapStatus = 'loading' | 'ready' | 'error';

/**
 * Startup gate: loads fonts, opens + migrates SQLite, hydrates settings and applies the
 * saved UI language. Font failure is non-fatal (system font fallback); DB failure is fatal.
 */
export function useAppBootstrap(): { status: BootstrapStatus; retry: () => void } {
  const [fontsLoaded, fontError] = useFonts(FONT_SOURCES);
  const [dataStatus, setDataStatus] = useState<BootstrapStatus>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initializeDatabase();
        await settingsService.hydrate(getLocales().map((l) => l.languageCode));
        if (!cancelled) setDataStatus('ready');
      } catch (error) {
        console.error('App bootstrap failed', error);
        if (!cancelled) setDataStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    if (fontError) console.warn('Font loading failed; using system fonts', fontError);
  }, [fontError]);

  const retry = () => {
    setDataStatus('loading');
    setAttempt((n) => n + 1);
  };
  const fontsSettled = fontsLoaded || fontError !== null;
  const status: BootstrapStatus =
    dataStatus === 'error' ? 'error' : fontsSettled && dataStatus === 'ready' ? 'ready' : 'loading';
  return { status, retry };
}
