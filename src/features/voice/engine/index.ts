import { NativeSpeechEngine } from './NativeSpeechEngine';
import {
  createSpeechRecognitionService,
  type SpeechRecognitionService,
} from './speechRecognitionService';
import type { SpeechEngine } from './types';

let service: SpeechRecognitionService | null = null;

/** App-wide recognition service (one microphone, one session). Created on first use. */
export function getSpeechRecognitionService(): SpeechRecognitionService {
  service ??= createSpeechRecognitionService(new NativeSpeechEngine());
  return service;
}

/** Replaces the engine (tests, or a future cloud provider). Cancels any running session. */
export function setSpeechEngine(engine: SpeechEngine): void {
  service?.cancel();
  service = createSpeechRecognitionService(engine);
}

export type {
  SpeechRecognitionService,
  VoiceSessionState,
  VoiceSessionStatus,
} from './speechRecognitionService';
export type * from './types';
