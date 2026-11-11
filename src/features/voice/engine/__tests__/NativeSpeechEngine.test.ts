import { NativeSpeechEngine } from '../NativeSpeechEngine';
import type { SpeechEvent } from '../types';

// Simulates Expo Go / a build without the plugin: the native module is not registered.
jest.mock('expo', () => ({ requireOptionalNativeModule: () => null }));

const mockPackageLoaded = jest.fn();
jest.mock('expo-speech-recognition', () => {
  mockPackageLoaded();
  throw new Error("Cannot find native module 'ExpoSpeechRecognition'");
});

describe('NativeSpeechEngine without the native module', () => {
  it('reports itself unavailable without loading the package', async () => {
    const engine = new NativeSpeechEngine();
    expect(await engine.isAvailable()).toBe(false);
    expect(await engine.getLocaleSupport('bn-IN')).toBe('unsupported');
    expect(await engine.getPermission()).toBe('denied');
    expect(mockPackageLoaded).not.toHaveBeenCalled();
  });

  it('emits an "unavailable" error instead of throwing on start', () => {
    const engine = new NativeSpeechEngine();
    const events: SpeechEvent[] = [];
    engine.subscribe((e) => events.push(e));
    expect(() => engine.start({ locale: 'en-IN', onDevice: false })).not.toThrow();
    expect(events).toEqual([{ type: 'error', error: { code: 'unavailable', detail: undefined } }]);
    expect(() => engine.abort()).not.toThrow();
  });
});
