import { createSpeechRecognitionService } from '../speechRecognitionService';
import type {
  LocaleSupport,
  SpeechEngine,
  SpeechEvent,
  SpeechListener,
  SpeechPermission,
} from '../types';

/** Scriptable in-memory engine: no microphone involved. */
class FakeEngine implements SpeechEngine {
  available = true;
  permission: SpeechPermission = 'granted';
  afterRequest: SpeechPermission = 'granted';
  support: LocaleSupport = 'onDevice';
  starts: { locale: string; onDevice: boolean }[] = [];
  stopped = 0;
  aborted = 0;
  private listeners = new Set<SpeechListener>();

  isAvailable = async () => this.available;
  getLocaleSupport = async () => this.support;
  getPermission = async () => this.permission;
  requestPermission = async () => this.afterRequest;
  start = (options: { locale: string; onDevice: boolean }) => {
    this.starts.push(options);
  };
  stop = () => {
    this.stopped++;
  };
  abort = () => {
    this.aborted++;
  };
  subscribe(listener: SpeechListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  emit(event: SpeechEvent) {
    for (const l of this.listeners) l(event);
  }
}

function setup() {
  const engine = new FakeEngine();
  const service = createSpeechRecognitionService(engine, () => 1_000);
  return { engine, service };
}

describe('speechRecognitionService', () => {
  it('runs a full session: start → partial → final → done', async () => {
    const { engine, service } = setup();
    await service.start('bn-IN');
    expect(service.getState().status).toBe('preparing');
    expect(engine.starts).toEqual([{ locale: 'bn-IN', onDevice: true }]);

    engine.emit({ type: 'start' });
    expect(service.getState()).toMatchObject({ status: 'listening', startedAt: 1_000 });
    engine.emit({ type: 'volume', level: 6 });
    engine.emit({ type: 'partial', text: 'আজ ৫০' });
    expect(service.getState()).toMatchObject({ transcript: 'আজ ৫০', volume: 6 });
    engine.emit({ type: 'final', text: 'আজ ৫০ টাকা চা' });
    engine.emit({ type: 'end' });
    expect(service.getState()).toMatchObject({
      status: 'done',
      transcript: 'আজ ৫০ টাকা চা',
      volume: 0,
      localeSupport: 'onDevice',
    });
  });

  it('keeps the session snapshot stable across volume-only updates', async () => {
    const { engine, service } = setup();
    await service.start('en-IN');
    engine.emit({ type: 'start' });
    const before = service.getSessionState();
    engine.emit({ type: 'volume', level: 4 });
    engine.emit({ type: 'volume', level: 7 });
    expect(service.getSessionState()).toBe(before);
    expect(service.getState().volume).toBe(7);
    engine.emit({ type: 'partial', text: 'tea 20' });
    expect(service.getSessionState()).not.toBe(before);
    expect(service.getSessionState().transcript).toBe('tea 20');
  });

  it('ignores a duplicate start while a session is running', async () => {
    const { engine, service } = setup();
    await service.start('en-IN');
    await service.start('en-IN');
    engine.emit({ type: 'start' });
    await service.start('en-IN');
    expect(engine.starts).toHaveLength(1);
  });

  it('stop finalizes through the engine', async () => {
    const { engine, service } = setup();
    await service.start('en-IN');
    engine.emit({ type: 'start' });
    service.stop();
    expect(engine.stopped).toBe(1);
    expect(service.getState().status).toBe('processing');
  });

  it('cancel aborts, discards the transcript and ignores late events', async () => {
    const { engine, service } = setup();
    await service.start('en-IN');
    engine.emit({ type: 'start' });
    engine.emit({ type: 'partial', text: 'tea' });
    service.cancel();
    expect(engine.aborted).toBe(1);
    engine.emit({ type: 'final', text: 'tea 50' });
    engine.emit({ type: 'error', error: { code: 'aborted' } });
    engine.emit({ type: 'end' });
    expect(service.getState()).toMatchObject({ status: 'idle', transcript: '', error: null });
  });

  it('cancel while idle does not touch the engine', () => {
    const { engine, service } = setup();
    service.cancel();
    expect(engine.aborted).toBe(0);
  });

  it('cancel during the async preparation prevents the microphone from starting', async () => {
    const { engine, service } = setup();
    const pending = service.start('en-IN');
    service.cancel();
    await pending;
    expect(engine.starts).toHaveLength(0);
    expect(service.getState().status).toBe('idle');
  });

  it('reports "no speech" when the session ends without words', async () => {
    const { engine, service } = setup();
    await service.start('en-IN');
    engine.emit({ type: 'start' });
    engine.emit({ type: 'end' });
    expect(service.getState()).toMatchObject({ status: 'error', error: { code: 'noSpeech' } });
  });

  it('keeps heard words when the engine reports no match afterwards', async () => {
    const { engine, service } = setup();
    await service.start('en-IN');
    engine.emit({ type: 'start' });
    engine.emit({ type: 'partial', text: 'tea fifty' });
    engine.emit({ type: 'error', error: { code: 'noSpeech' } });
    engine.emit({ type: 'end' });
    expect(service.getState()).toMatchObject({ status: 'done', transcript: 'tea fifty' });
  });

  it.each(['network', 'busy', 'interrupted', 'languageUnsupported', 'unknown'] as const)(
    'surfaces engine error %s',
    async (code) => {
      const { engine, service } = setup();
      await service.start('en-IN');
      engine.emit({ type: 'start' });
      engine.emit({ type: 'error', error: { code } });
      expect(service.getState()).toMatchObject({ status: 'error', error: { code } });
    },
  );

  it('fails when the device has no recognizer', async () => {
    const { engine, service } = setup();
    engine.available = false;
    await service.start('en-IN');
    expect(service.getState().error?.code).toBe('unavailable');
    expect(engine.starts).toHaveLength(0);
  });

  it('asks for permission once and reports denial', async () => {
    const { engine, service } = setup();
    engine.permission = 'denied';
    engine.afterRequest = 'denied';
    await service.start('en-IN');
    expect(service.getState()).toMatchObject({
      status: 'error',
      error: { code: 'permissionDenied' },
      permission: 'denied',
    });
  });

  it('reports a blocked permission without prompting', async () => {
    const { engine, service } = setup();
    const request = jest.spyOn(engine, 'requestPermission');
    engine.permission = 'blocked';
    await service.start('en-IN');
    expect(request).not.toHaveBeenCalled();
    expect(service.getState().permission).toBe('blocked');
  });

  it('continues after permission is granted on request', async () => {
    const { engine, service } = setup();
    engine.permission = 'denied';
    engine.afterRequest = 'granted';
    await service.start('en-IN');
    expect(engine.starts).toHaveLength(1);
  });

  it('refuses an unsupported locale and uses network recognition when not installed', async () => {
    const { engine, service } = setup();
    engine.support = 'unsupported';
    await service.start('bn-IN');
    expect(service.getState().error?.code).toBe('languageUnsupported');

    engine.support = 'network';
    await service.start('bn-IN');
    expect(engine.starts).toEqual([{ locale: 'bn-IN', onDevice: false }]);
    expect(service.getState().localeSupport).toBe('network');
  });

  it('notifies subscribers on every change', async () => {
    const { service } = setup();
    const listener = jest.fn();
    const unsubscribe = service.subscribe(listener);
    await service.start('en-IN');
    expect(listener).toHaveBeenCalled();
    unsubscribe();
    listener.mockClear();
    service.cancel();
    expect(listener).not.toHaveBeenCalled();
  });
});
