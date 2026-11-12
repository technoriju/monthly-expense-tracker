import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { Alert, Keyboard, ScrollView } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { categoryRepository } from '@/database';
import {
  createMigratedTestDatabase,
  type TestDatabase,
} from '@/database/testing/createTestDatabase';
import { transactionService } from '@/features/transactions/services/transactionService';
import { changeUiLanguage } from '@/i18n';
import { useSettingsStore } from '@/store/settingsStore';
import { useUiStore } from '@/store/uiStore';
import { useVoiceDraftStore } from '@/store/voiceDraftStore';

import { VoiceEntryView } from '../components/VoiceEntryView';
import { VoiceReviewView } from '../components/VoiceReviewView';
import { setSpeechEngine } from '../engine';
import { useVoiceReview } from '../hooks/useVoiceReview';
import type { SpeechEngine, SpeechEvent, SpeechListener } from '../engine/types';
import { parseVoiceExpense } from '../parser/voiceExpenseParser';
import type { VoiceExpenseDraft } from '../types';

let mockDb: TestDatabase;

jest.mock('@/database/client', () => ({
  getDatabase: async () => mockDb,
}));

// lucide ships ESM only; icons are irrelevant to these tests.
jest.mock(
  'lucide-react-native',
  () => new Proxy({}, { get: (_target, name) => (name === '__esModule' ? false : () => null) }),
);

// Minimal Reanimated stand-in for the mic pulse: the native worklets runtime is not
// available in Jest, and the animation is not under test.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: { View },
    cancelAnimation: () => {},
    Easing: { out: (f: unknown) => f, ease: (t: number) => t },
    useAnimatedStyle: () => ({}),
    useReducedMotion: () => true,
    useSharedValue: <T,>(value: T) => ({ value }),
    withRepeat: <T,>(animation: T) => animation,
    withTiming: <T,>(value: T) => value,
  };
});

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    router: { back: jest.fn(), push: jest.fn(), dismissTo: jest.fn(), navigate: jest.fn() },
    useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]),
  };
});

interface TxRow {
  amount_minor: number;
  source: string;
  voice_transcript: string | null;
  note: string | null;
  occurred_on: string;
}

const rows = () =>
  mockDb.getAllAsync<TxRow>(
    'SELECT amount_minor, source, voice_transcript, note, occurred_on FROM transactions',
  );

const TODAY = new Date();

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const renderScreen = (ui: ReactElement) =>
  render(<SafeAreaProvider initialMetrics={METRICS}>{ui}</SafeAreaProvider>);

function draftFor(text: string, language: VoiceExpenseDraft['language'] = 'en') {
  return parseVoiceExpense(text, { language, currency: 'INR', today: TODAY });
}

async function renderReview(draft: VoiceExpenseDraft) {
  useVoiceDraftStore.getState().setDraft(draft);
  await renderScreen(<VoiceReviewView />);
  // Category list loads asynchronously from the DB; wait for the parsed one to be selected.
  if (draft.categoryKey) {
    await waitFor(() => expect(screen.getByRole('radio', { checked: true })).toBeTruthy());
  }
}

const confirmButton = () => screen.getByTestId('voice-confirm');

beforeEach(async () => {
  mockDb = await createMigratedTestDatabase();
  await changeUiLanguage('en');
  useSettingsStore.getState().applySettings({ uiLanguage: 'en', voiceLanguage: 'en' });
  useVoiceDraftStore.getState().clearDraft();
  useUiStore.setState({ toast: null });
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
  mockDb.close();
});

describe('Voice review → save', () => {
  it('shows the recognized speech and pre-fills the form', async () => {
    await renderReview(draftFor('I spent 50 rupees on tea'));
    expect(screen.getAllByText('I spent 50 rupees on tea').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Amount')).toHaveDisplayValue('50');
    expect(screen.getByRole('radio', { checked: true })).toHaveAccessibleName('Food');
    expect(await rows()).toHaveLength(0); // nothing is saved before confirmation
  });

  it('saves through the transaction service only on Confirm & Save', async () => {
    const create = jest.spyOn(transactionService, 'create');
    const before = useUiStore.getState().dataVersion;
    await renderReview(draftFor('I spent 50 rupees on tea'));

    await fireEvent.press(confirmButton());

    await waitFor(async () => expect(await rows()).toHaveLength(1));
    expect(create).toHaveBeenCalledTimes(1);
    expect((await rows())[0]).toMatchObject({
      amount_minor: 5_000,
      source: 'voice',
      voice_transcript: 'I spent 50 rupees on tea',
      note: 'I spent 50 rupees on tea',
    });
    expect(useUiStore.getState().dataVersion).toBe(before + 1); // dashboard + history refetch
    expect(useUiStore.getState().toast?.message).toBe('Expense saved');
    expect(useVoiceDraftStore.getState().draft).toBeNull();
    expect(router.dismissTo).toHaveBeenCalledWith('/');
  });

  it('prevents double submission', async () => {
    const draft = draftFor('Paid 500 rupees for electricity');
    useVoiceDraftStore.getState().setDraft(draft);
    const { result } = await renderHook(() => useVoiceReview(draft));
    await waitFor(() => expect(result.current.form.getValues('categoryId')).not.toBeNull());

    // Three taps in the same tick: only the first may reach the database.
    await act(async () => {
      await Promise.all([
        result.current.submit(),
        result.current.submit(),
        result.current.submit(),
      ]);
    });
    expect(await rows()).toHaveLength(1);
    expect(router.dismissTo).toHaveBeenCalledTimes(1);
  });

  it('keeps the draft when saving fails, and the retry succeeds', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const create = jest
      .spyOn(transactionService, 'create')
      .mockRejectedValueOnce(new Error('disk full'));
    await renderReview(draftFor('Spent 120 on lunch today'));

    await fireEvent.press(confirmButton());
    expect(await screen.findByText('Could not save. Please try again.')).toBeTruthy();
    expect(await rows()).toHaveLength(0);
    expect(useVoiceDraftStore.getState().draft).not.toBeNull();
    expect(screen.getByLabelText('Amount')).toHaveDisplayValue('120');
    expect(router.dismissTo).not.toHaveBeenCalled();

    await fireEvent.press(confirmButton());
    await waitFor(async () => expect(await rows()).toHaveLength(1));
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('blocks saving while the amount is missing and saves once the user enters it', async () => {
    const draft = draftFor('lunch today');
    expect(draft.missingFields).toEqual(['amount']);
    await renderReview(draft);
    expect(screen.getByText("We couldn't catch the amount. Please enter it.")).toBeTruthy();

    await fireEvent.press(confirmButton());
    expect(await screen.findByText('Enter an amount')).toBeTruthy();
    expect(await rows()).toHaveLength(0);

    await fireEvent.changeText(screen.getByLabelText('Amount'), '৮০');
    await fireEvent.press(confirmButton());
    await waitFor(async () => expect(await rows()).toHaveLength(1));
    expect((await rows())[0]?.amount_minor).toBe(8_000);
  });

  it('requires a manual category choice when the category is uncertain', async () => {
    await renderReview(draftFor('doctor fees 700 rupees'));
    expect(
      await screen.findByText('This could fit more than one category — please choose.'),
    ).toBeTruthy();
    expect(screen.queryByRole('radio', { checked: true })).toBeNull();

    const dismiss = jest.spyOn(Keyboard, 'dismiss');
    const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo');
    await fireEvent.press(confirmButton());
    expect(await screen.findByText('Choose a category')).toBeTruthy();
    expect(screen.getByRole('alert', { name: 'Choose a category' })).toBeTruthy();
    // The error sits above the fold: the keyboard closes and the form scrolls up to it.
    expect(dismiss).toHaveBeenCalled();
    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
    expect(await rows()).toHaveLength(0);

    await fireEvent.press(screen.getByRole('radio', { name: 'Healthcare' }));
    await fireEvent.press(confirmButton());
    await waitFor(async () => expect(await rows()).toHaveLength(1));
    const healthcare = (await categoryRepository.listAll()).find((c) => c.key === 'healthcare');
    const saved = await mockDb.getFirstAsync<{ category_id: number }>(
      'SELECT category_id FROM transactions',
    );
    expect(saved?.category_id).toBe(healthcare?.id);
  });

  it('cancelling asks first, then discards the draft without writing', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    await renderReview(draftFor('I spent 50 rupees on tea'));

    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(alert).toHaveBeenCalledTimes(1);
    expect(useVoiceDraftStore.getState().draft).not.toBeNull();

    const buttons = alert.mock.calls[0]?.[2] ?? [];
    const discard = buttons.find((b) => b.style === 'destructive');
    await act(async () => discard?.onPress?.());
    expect(useVoiceDraftStore.getState().draft).toBeNull();
    expect(router.back).toHaveBeenCalled();
    expect(await rows()).toHaveLength(0);
  });

  it('shows an empty state when there is no draft', async () => {
    await renderScreen(<VoiceReviewView />);
    expect(screen.getByText('Nothing to review')).toBeTruthy();
  });

  it('renders in Bengali with the Bengali transcript', async () => {
    await changeUiLanguage('bn');
    useSettingsStore.getState().applySettings({ uiLanguage: 'bn' });
    await renderReview(draftFor('আজ ৫০ টাকা চা খেয়েছি', 'bn'));
    expect(screen.getByText('খরচ যাচাই করুন')).toBeTruthy();
    expect(screen.getByText('আজ ৫০ টাকা চা খেয়েছি')).toBeTruthy();
    expect(screen.getByRole('radio', { checked: true })).toHaveAccessibleName('খাবার');
    expect(screen.getByRole('button', { name: 'নিশ্চিত করে সেভ করুন' })).toBeTruthy();
  });
});

/** Engine double that records calls and lets the test play recognizer events. */
class ScriptedEngine implements SpeechEngine {
  starts: string[] = [];
  aborted = 0;
  private listener: SpeechListener | null = null;
  isAvailable = async () => true;
  getLocaleSupport = async () => 'onDevice' as const;
  getPermission = async () => 'granted' as const;
  requestPermission = async () => 'granted' as const;
  start = ({ locale }: { locale: string }) => {
    this.starts.push(locale);
  };
  stop = () => {};
  abort = () => {
    this.aborted++;
  };
  subscribe(listener: SpeechListener) {
    this.listener = listener;
    return () => {
      this.listener = null;
    };
  }
  async emit(...events: SpeechEvent[]) {
    await act(async () => events.forEach((e) => this.listener?.(e)));
  }
}

describe('Voice entry screen', () => {
  it('records in the voice language, then hands a draft to the review screen', async () => {
    const engine = new ScriptedEngine();
    setSpeechEngine(engine);
    useSettingsStore.getState().applySettings({ voiceLanguage: 'bn' });
    await renderScreen(<VoiceEntryView />);

    await fireEvent.press(screen.getByRole('button', { name: 'Start recording' }));
    await waitFor(() => expect(engine.starts).toEqual(['bn-IN']));
    await engine.emit({ type: 'start' });
    expect(screen.getByText('Listening…')).toBeTruthy();

    await engine.emit(
      { type: 'partial', text: 'গতকাল যাতায়াতে' },
      { type: 'final', text: 'গতকাল যাতায়াতে ৮০ টাকা খরচ হয়েছে' },
      { type: 'end' },
    );
    expect(screen.getByText('গতকাল যাতায়াতে ৮০ টাকা খরচ হয়েছে')).toBeTruthy();
    expect(await rows()).toHaveLength(0); // voice never writes to the DB

    await fireEvent.press(screen.getByRole('button', { name: 'Review expense' }));
    expect(router.push).toHaveBeenCalledWith('/voice/review');
    expect(useVoiceDraftStore.getState().draft).toMatchObject({
      amountMinor: 8_000,
      categoryKey: 'transportation',
      language: 'bn',
      status: 'complete',
    });
    expect(await rows()).toHaveLength(0);
  });

  it('offers manual entry when recognition fails', async () => {
    const engine = new ScriptedEngine();
    setSpeechEngine(engine);
    await renderScreen(<VoiceEntryView />);
    await fireEvent.press(screen.getByRole('button', { name: 'Start recording' }));
    await waitFor(() => expect(engine.starts).toHaveLength(1));
    await engine.emit({ type: 'start' }, { type: 'end' });

    expect(screen.getByText("We didn't hear anything")).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Enter manually' }));
    expect(router.push).toHaveBeenCalledWith('/transaction/new');
  });

  it('stops the microphone when the screen unmounts', async () => {
    const engine = new ScriptedEngine();
    setSpeechEngine(engine);
    const { unmount } = await renderScreen(<VoiceEntryView />);
    await fireEvent.press(screen.getByRole('button', { name: 'Start recording' }));
    await waitFor(() => expect(engine.starts).toHaveLength(1));
    await engine.emit({ type: 'start' });
    await act(async () => unmount());
    expect(engine.aborted).toBeGreaterThan(0);
  });

  it('changes the voice language without changing the UI language', async () => {
    setSpeechEngine(new ScriptedEngine());
    await renderScreen(<VoiceEntryView />);
    await fireEvent.press(screen.getByRole('radio', { name: 'हिन्दी' }));
    await waitFor(() => expect(useSettingsStore.getState().voiceLanguage).toBe('hi'));
    expect(useSettingsStore.getState().uiLanguage).toBe('en');
    expect(screen.getByText('Speak your expense in Hindi')).toBeTruthy();
  });
});
