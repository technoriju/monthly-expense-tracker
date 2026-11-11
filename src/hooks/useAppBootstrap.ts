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
export function useAppBootstrap(): BootstrapStatus {
  const [fontsLoaded, fontError] = useFonts(FONT_SOURCES);
  const [dataStatus, setDataStatus] = useState<BootstrapStatus>('loading');

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
  }, []);

  useEffect(() => {
    if (fontError) console.warn('Font loading failed; using system fonts', fontError);
  }, [fontError]);

  const fontsSettled = fontsLoaded || fontError !== null;
  if (dataStatus === 'error') return 'error';
  return fontsSettled && dataStatus === 'ready' ? 'ready' : 'loading';
}
