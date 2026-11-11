/**
 * Speech-to-text abstraction. The voice UI and transaction workflow depend only on this
 * interface, so a future cloud provider can replace `NativeSpeechEngine` without touching them.
 */

export type SpeechErrorCode =
  | 'permissionDenied'
  | 'noSpeech'
  | 'languageUnsupported'
  | 'unavailable'
  | 'network'
  | 'busy'
  | 'interrupted'
  | 'aborted'
  | 'unknown';

export interface SpeechError {
  code: SpeechErrorCode;
  /** Engine-specific detail for logs. Never shown to the user. */
  detail?: string;
}

export type SpeechPermission = 'granted' | 'denied' | 'blocked';

/**
 * How the engine can recognize a locale on this device:
 * `onDevice` — offline model installed; `network` — supported but may need internet;
 * `unsupported` — not available; `unknown` — the device cannot tell (try and handle errors).
 */
export type LocaleSupport = 'onDevice' | 'network' | 'unsupported' | 'unknown';

export type SpeechEvent =
  | { type: 'start' }
  | { type: 'partial'; text: string }
  | { type: 'final'; text: string }
  | { type: 'volume'; level: number }
  | { type: 'error'; error: SpeechError }
  | { type: 'end' };

export type SpeechListener = (event: SpeechEvent) => void;

export interface SpeechStartOptions {
  /** BCP-47 locale, e.g. 'bn-IN'. */
  locale: string;
  /** Require offline recognition (only when `getLocaleSupport` returned `onDevice`). */
  onDevice: boolean;
}

export interface SpeechEngine {
  isAvailable(): Promise<boolean>;
  getLocaleSupport(locale: string): Promise<LocaleSupport>;
  getPermission(): Promise<SpeechPermission>;
  requestPermission(): Promise<SpeechPermission>;
  start(options: SpeechStartOptions): void;
  /** Stops listening and delivers the final result. */
  stop(): void;
  /** Stops immediately and discards the result. */
  abort(): void;
  subscribe(listener: SpeechListener): () => void;
}
