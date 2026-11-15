import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import type {
  ExpoSpeechRecognitionErrorCode,
  ExpoSpeechRecognitionModule as NativeModuleType,
} from 'expo-speech-recognition';

import type {
  LocaleSupport,
  SpeechEngine,
  SpeechErrorCode,
  SpeechListener,
  SpeechPermission,
  SpeechStartOptions,
} from './types';

type NativeModule = typeof NativeModuleType;

/**
 * Loads the native module lazily. It is missing in Expo Go and in builds made before the
 * plugin was added; the engine then reports itself unavailable instead of crashing.
 */
function loadNativeModule(): NativeModule | null {
  // Probe first: in dev, Metro reports an error thrown while loading a module as fatal
  // even inside try/catch, so the package must not be required when the module is absent.
  if (!requireOptionalNativeModule('ExpoSpeechRecognition')) return null;
  try {
    // A static import would load the package (and fail) at app start without the module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-speech-recognition') as {
      ExpoSpeechRecognitionModule: NativeModule;
    };
    return mod.ExpoSpeechRecognitionModule;
  } catch {
    return null;
  }
}

const ERROR_MAP: Partial<Record<ExpoSpeechRecognitionErrorCode, SpeechErrorCode>> = {
  'not-allowed': 'permissionDenied',
  'service-not-allowed': 'unavailable',
  'audio-capture': 'unavailable',
  'language-not-supported': 'languageUnsupported',
  'no-speech': 'noSpeech',
  'speech-timeout': 'noSpeech',
  network: 'network',
  busy: 'busy',
  'too-many-requests': 'busy',
  interrupted: 'interrupted',
  aborted: 'aborted',
};

/**
 * Google's recognizer supports Bengali and the other Indian languages. Some devices (Samsung)
 * default to a vendor recognizer that lacks them, so Google is asked for explicitly when present.
 * Must stay listed in `androidSpeechServicePackages` in app.json (package visibility).
 */
const GOOGLE_SPEECH_SERVICE = 'com.google.android.googlequicksearchbox';

function pickServicePackage(module: NativeModule): string | undefined {
  if (Platform.OS !== 'android') return undefined;
  try {
    return module.getSpeechRecognitionServices().includes(GOOGLE_SPEECH_SERVICE)
      ? GOOGLE_SPEECH_SERVICE
      : undefined;
  } catch {
    return undefined; // fall back to the system default recognizer
  }
}

const normalizeLocale = (locale: string) => locale.replace('_', '-').toLowerCase();
const languageOf = (locale: string) => normalizeLocale(locale).split('-')[0];

function toPermission(result: { granted: boolean; canAskAgain: boolean }): SpeechPermission {
  if (result.granted) return 'granted';
  return result.canAskAgain ? 'denied' : 'blocked';
}

/** `SpeechEngine` over the device recognizer (Android SpeechRecognizer / iOS SFSpeechRecognizer). */
export class NativeSpeechEngine implements SpeechEngine {
  private readonly module = loadNativeModule();
  private readonly listeners = new Set<SpeechListener>();
  private attached = false;
  private servicePackage: string | undefined | null = null; // null = not resolved yet

  async isAvailable(): Promise<boolean> {
    if (!this.module) return false;
    try {
      return this.module.isRecognitionAvailable();
    } catch {
      return false;
    }
  }

  async getLocaleSupport(locale: string): Promise<LocaleSupport> {
    if (!this.module) return 'unsupported';
    try {
      const wanted = normalizeLocale(locale);
      // Without a package this asks the system on-device recognizer (offline models).
      const onDevice = await this.module.getSupportedLocales({});
      if (onDevice.installedLocales.some((l) => normalizeLocale(l) === wanted)) return 'onDevice';
      const servicePackage = this.getServicePackage(this.module);
      const { locales } = servicePackage
        ? await this.module.getSupportedLocales({ androidRecognitionServicePackage: servicePackage })
        : onDevice;
      if (locales.some((l) => normalizeLocale(l) === wanted)) return 'network';
      // Older Android returns empty lists; another region of the language may still work.
      if (locales.length === 0 || locales.some((l) => languageOf(l) === languageOf(locale))) {
        return 'unknown';
      }
      return 'unsupported';
    } catch {
      return 'unknown';
    }
  }

  async getPermission(): Promise<SpeechPermission> {
    if (!this.module) return 'denied';
    return toPermission(await this.module.getPermissionsAsync());
  }

  async requestPermission(): Promise<SpeechPermission> {
    if (!this.module) return 'denied';
    return toPermission(await this.module.requestPermissionsAsync());
  }

  start({ locale, onDevice }: SpeechStartOptions): void {
    if (!this.module) {
      this.emitError('unavailable');
      return;
    }
    this.attach(this.module);
    this.module.start({
      lang: locale,
      interimResults: true,
      continuous: false,
      maxAlternatives: 1,
      requiresOnDeviceRecognition: onDevice,
      androidRecognitionServicePackage: this.getServicePackage(this.module),
      addsPunctuation: false,
      volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
    });
  }

  stop(): void {
    this.module?.stop();
  }

  abort(): void {
    this.module?.abort();
  }

  subscribe(listener: SpeechListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private getServicePackage(module: NativeModule): string | undefined {
    if (this.servicePackage === null) this.servicePackage = pickServicePackage(module);
    return this.servicePackage;
  }

  private emit: SpeechListener = (event) => {
    for (const listener of this.listeners) listener(event);
  };

  private emitError(code: SpeechErrorCode, detail?: string) {
    this.emit({ type: 'error', error: { code, detail } });
  }

  /** Native listeners are added once and live as long as the app (one engine instance). */
  private attach(module: NativeModule) {
    if (this.attached) return;
    this.attached = true;
    module.addListener('start', () => this.emit({ type: 'start' }));
    module.addListener('end', () => this.emit({ type: 'end' }));
    module.addListener('result', (event) => {
      const text = event.results[0]?.transcript ?? '';
      this.emit(event.isFinal ? { type: 'final', text } : { type: 'partial', text });
    });
    module.addListener('nomatch', () => this.emitError('noSpeech', 'nomatch'));
    module.addListener('volumechange', (event) =>
      this.emit({ type: 'volume', level: event.value }),
    );
    module.addListener('error', (event) =>
      this.emitError(ERROR_MAP[event.error] ?? 'unknown', `${event.error}: ${event.message}`),
    );
  }
}
