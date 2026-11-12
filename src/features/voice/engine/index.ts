import { NativeSpeechEngine } from './NativeSpeechEngine';
import {
  createSpeechRecognitionService,
  type SpeechRecognitionService,
} from './speechRecognitionService';
import type { SpeechEngine } from './types';

let engine: SpeechEngine | null = null;
let service: SpeechRecognitionService | null = null;

/** The active speech engine (for capability checks that must not start a session). */
export function getSpeechEngine(): SpeechEngine {
  engine ??= new NativeSpeechEngine();
  return engine;
}

/** App-wide recognition service (one microphone, one session). Created on first use. */
export function getSpeechRecognitionService(): SpeechRecognitionService {
  service ??= createSpeechRecognitionService(getSpeechEngine());
  return service;
}

/** Replaces the engine (tests, or a future cloud provider). Cancels any running session. */
export function setSpeechEngine(next: SpeechEngine): void {
  service?.cancel();
  engine = next;
  service = createSpeechRecognitionService(next);
}

export type {
  SpeechRecognitionService,
  VoiceSessionState,
  VoiceSessionStatus,
} from './speechRecognitionService';
export type * from './types';
