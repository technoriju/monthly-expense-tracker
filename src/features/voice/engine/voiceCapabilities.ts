import type { LocaleSupport, SpeechEngine, SpeechPermission } from './types';

export interface VoiceCapabilities {
  /** A recognizer exists on the device and in this app build. */
  available: boolean;
  /** Null when no recognizer is available (permission is then irrelevant). */
  permission: SpeechPermission | null;
  /** Null when no recognizer is available. */
  localeSupport: LocaleSupport | null;
}

/**
 * Reads what voice entry can do on this device for `locale` without starting a recording or
 * prompting for permission.
 */
export async function checkVoiceCapabilities(
  engine: SpeechEngine,
  locale: string,
): Promise<VoiceCapabilities> {
  if (!(await engine.isAvailable())) {
    return { available: false, permission: null, localeSupport: null };
  }
  const [permission, localeSupport] = await Promise.all([
    engine.getPermission(),
    engine.getLocaleSupport(locale),
  ]);
  return { available: true, permission, localeSupport };
}
