import type {
  LocaleSupport,
  SpeechEngine,
  SpeechError,
  SpeechEvent,
  SpeechPermission,
} from './types';

export type VoiceSessionStatus =
  'idle' | 'preparing' | 'listening' | 'processing' | 'done' | 'error';

export interface VoiceSessionState {
  status: VoiceSessionStatus;
  /** Latest partial or final transcript. */
  transcript: string;
  /** Volume level, roughly −2 (silence) … 10 (loud). */
  volume: number;
  error: SpeechError | null;
  /** Set when permission was not granted ('blocked' = must be enabled in system settings). */
  permission: SpeechPermission | null;
  /** How the current locale is recognized (offline vs. may need internet). */
  localeSupport: LocaleSupport | null;
  /** Epoch ms when the microphone started listening. */
  startedAt: number | null;
}

export const INITIAL_SESSION_STATE: VoiceSessionState = {
  status: 'idle',
  transcript: '',
  volume: 0,
  error: null,
  permission: null,
  localeSupport: null,
  startedAt: null,
};

const ACTIVE: readonly VoiceSessionStatus[] = ['preparing', 'listening', 'processing'];

/**
 * One recording session at a time, independent of React. Owns the lifecycle
 * (availability → permission → locale check → listen → result | error), ignores duplicate
 * starts, and drops late events from cancelled sessions. Swap the engine to change providers.
 */
export function createSpeechRecognitionService(engine: SpeechEngine, now = () => Date.now()) {
  let state: VoiceSessionState = INITIAL_SESSION_STATE;
  /**
   * `state` as of its last non-volume change. Volume events arrive ~10×/s while listening;
   * screens read this snapshot so only the waveform re-renders for them.
   */
  let sessionState: VoiceSessionState = state;
  const listeners = new Set<() => void>();
  /** Incremented on every start/cancel so async steps of an old session stop early. */
  let session = 0;

  const set = (patch: Partial<VoiceSessionState>) => {
    state = { ...state, ...patch };
    if (Object.keys(patch).some((key) => key !== 'volume')) sessionState = state;
    for (const listener of listeners) listener();
  };
  const fail = (error: SpeechError, extra: Partial<VoiceSessionState> = {}) =>
    set({ status: 'error', error, volume: 0, ...extra });
  const isActive = () => ACTIVE.includes(state.status);

  const onEvent = (event: SpeechEvent) => {
    if (!isActive()) return; // idle / cancelled / finished: late events are ignored
    switch (event.type) {
      case 'start':
        set({ status: 'listening', startedAt: now() });
        break;
      case 'partial':
        set({ transcript: event.text });
        break;
      case 'final':
        set({ transcript: event.text, status: 'processing', volume: 0 });
        break;
      case 'volume':
        if (state.status === 'listening') set({ volume: event.level });
        break;
      case 'error':
        // An abort we requested is not a user-facing error.
        if (event.error.code === 'aborted') return;
        // "No match" after partial text: keep what was heard; `end` finishes the session.
        if (event.error.code === 'noSpeech' && state.transcript.trim().length > 0) return;
        fail(event.error);
        break;
      case 'end':
        if (state.status === 'preparing') return; // late `end` of an earlier, aborted session
        if (state.transcript.trim().length > 0) set({ status: 'done', volume: 0 });
        else fail({ code: 'noSpeech' });
        break;
    }
  };
  engine.subscribe(onEvent);

  return {
    getState: () => state,
    /** Same as `getState()` but unchanged by volume-only updates (its `volume` may be stale). */
    getSessionState: () => sessionState,

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    /** Starts listening in `locale`. Ignored while a session is already running. */
    async start(locale: string): Promise<void> {
      if (isActive()) return;
      const id = ++session;
      set({ ...INITIAL_SESSION_STATE, status: 'preparing' });

      const available = await engine.isAvailable();
      if (id !== session) return;
      if (!available) return fail({ code: 'unavailable' });

      let permission = await engine.getPermission();
      if (id !== session) return;
      if (permission === 'denied') permission = await engine.requestPermission();
      if (id !== session) return;
      if (permission !== 'granted') return fail({ code: 'permissionDenied' }, { permission });

      const localeSupport = await engine.getLocaleSupport(locale);
      if (id !== session) return;
      if (localeSupport === 'unsupported') {
        return fail({ code: 'languageUnsupported' }, { localeSupport });
      }
      set({ localeSupport });
      engine.start({ locale, onDevice: localeSupport === 'onDevice' });
    },

    /** Stops listening; the recognizer then delivers the final transcript. */
    stop(): void {
      if (state.status !== 'listening') return;
      set({ status: 'processing', volume: 0 });
      engine.stop();
    },

    /** Aborts any session and discards its result. Safe to call at any time (unmount, blur). */
    cancel(): void {
      session++;
      const wasActive = isActive();
      set(INITIAL_SESSION_STATE);
      if (wasActive) engine.abort();
    },
  };
}

export type SpeechRecognitionService = ReturnType<typeof createSpeechRecognitionService>;
