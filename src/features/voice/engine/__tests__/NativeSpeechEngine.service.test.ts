import { NativeSpeechEngine } from '../NativeSpeechEngine';

const GOOGLE = 'com.google.android.googlequicksearchbox';

const mockModule = {
  getSpeechRecognitionServices: jest.fn<string[], []>(),
  getSupportedLocales: jest.fn(),
  start: jest.fn(),
  addListener: jest.fn(),
};

jest.mock('expo', () => ({ requireOptionalNativeModule: () => ({}) }));
jest.mock('expo-speech-recognition', () => ({ ExpoSpeechRecognitionModule: mockModule }));
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));

/** Locales reported per service: '' = system on-device recognizer, else the package name. */
function reportLocales(byService: Record<string, { locales: string[]; installedLocales: string[] }>) {
  mockModule.getSupportedLocales.mockImplementation(
    async (o: { androidRecognitionServicePackage?: string }) =>
      byService[o.androidRecognitionServicePackage ?? ''],
  );
}

beforeEach(() => jest.clearAllMocks());

describe('NativeSpeechEngine recognition service (Android)', () => {
  it('uses Google when installed, so a vendor default without Bengali is bypassed', async () => {
    mockModule.getSpeechRecognitionServices.mockReturnValue(['com.samsung.android.bixby.agent', GOOGLE]);
    reportLocales({
      '': { locales: ['hi-IN'], installedLocales: [] },
      [GOOGLE]: { locales: ['bn-IN', 'hi-IN'], installedLocales: [] },
    });
    const engine = new NativeSpeechEngine();

    expect(await engine.getLocaleSupport('bn-IN')).toBe('network');
    engine.start({ locale: 'bn-IN', onDevice: false });
    expect(mockModule.start).toHaveBeenCalledWith(
      expect.objectContaining({ lang: 'bn-IN', androidRecognitionServicePackage: GOOGLE }),
    );
  });

  it('prefers an installed offline model over the network service', async () => {
    mockModule.getSpeechRecognitionServices.mockReturnValue([GOOGLE]);
    reportLocales({ '': { locales: ['bn-IN'], installedLocales: ['bn-IN'] } });
    expect(await new NativeSpeechEngine().getLocaleSupport('bn-IN')).toBe('onDevice');
  });

  it('falls back to the system default recognizer when Google is absent', async () => {
    mockModule.getSpeechRecognitionServices.mockReturnValue(['com.samsung.android.bixby.agent']);
    reportLocales({ '': { locales: ['hi-IN'], installedLocales: [] } });
    const engine = new NativeSpeechEngine();

    expect(await engine.getLocaleSupport('bn-IN')).toBe('unsupported');
    engine.start({ locale: 'hi-IN', onDevice: false });
    expect(mockModule.start).toHaveBeenCalledWith(
      expect.objectContaining({ androidRecognitionServicePackage: undefined }),
    );
  });
});
