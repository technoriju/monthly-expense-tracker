import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { Alert, type AlertButton, Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  categoryRepository,
  dataRepository,
  settingsRepository,
  transactionRepository,
} from '@/database';
import {
  createMigratedTestDatabase,
  type TestDatabase,
} from '@/database/testing/createTestDatabase';
import { serializeBackup, createBackupDocument } from '@/features/data-management/backupFormat';
import { ExportCsvView } from '@/features/data-management/components/ExportCsvView';
import { RestoreView } from '@/features/data-management/components/RestoreView';
import { localBackupProvider } from '@/features/data-management/providers';
import { exportService } from '@/features/reports/services/exportService';
import { setSpeechEngine, type SpeechEngine } from '@/features/voice/engine';
import { changeUiLanguage } from '@/i18n';
import { useSettingsStore } from '@/store/settingsStore';
import { useUiStore } from '@/store/uiStore';

import { SettingsView } from '../components/SettingsView';
import { HelpView } from '../components/HelpView';
import { MoreView } from '../components/MoreView';
import { ThemeSelectView } from '../components/ThemeSelectView';
import { VoiceSettingsView } from '../components/VoiceSettingsView';

let mockDb: TestDatabase;

jest.mock('@/database/client', () => ({
  getDatabase: async () => mockDb,
}));

// lucide ships ESM only; icons are irrelevant to these tests.
jest.mock(
  'lucide-react-native',
  () => new Proxy({}, { get: (_target, name) => (name === '__esModule' ? false : () => null) }),
);

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), navigate: jest.fn() },
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
}));

jest.mock('@/features/data-management/providers', () => ({
  localBackupProvider: { save: jest.fn(async () => 'saved'), pick: jest.fn() },
}));

jest.mock('@/features/reports/services/exportService', () => ({
  exportService: {
    exportTransactionsCsv: jest.fn(async () => 'shared'),
    exportTransactionsPdf: jest.fn(async () => 'shared'),
  },
}));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const renderScreen = (ui: ReactElement) =>
  render(<SafeAreaProvider initialMetrics={METRICS}>{ui}</SafeAreaProvider>);

/** Presses the Alert button with `text` from the most recent Alert.alert call. */
function pressAlertButton(alert: jest.SpyInstance, text: string): void {
  const buttons = alert.mock.calls.at(-1)?.[2] as AlertButton[] | undefined;
  const button = buttons?.find((b) => b.text === text);
  if (!button?.onPress) throw new Error(`No alert button "${text}"`);
  button.onPress();
}

async function addExpense(): Promise<void> {
  const food = (await categoryRepository.listAll()).find((c) => c.key === 'food');
  await transactionRepository.insert({
    type: 'expense',
    amountMinor: 10_000,
    currency: 'INR',
    categoryId: food!.id,
    occurredOn: '2026-11-01',
    note: null,
    paymentMethod: null,
    source: 'manual',
  });
}

beforeEach(async () => {
  mockDb = await createMigratedTestDatabase();
  await changeUiLanguage('en');
  useSettingsStore
    .getState()
    .applySettings({ uiLanguage: 'en', themeMode: 'system', voiceLanguage: 'bn' });
  jest.mocked(router.push).mockClear();
  jest.mocked(router.back).mockClear();
});

afterEach(() => {
  mockDb.close();
  jest.restoreAllMocks();
});

describe('SettingsView', () => {
  it('shows every section and navigates to the sub-screens', async () => {
    await renderScreen(<SettingsView />);
    for (const title of ['General', 'Voice', 'Data management', 'About']) {
      expect(screen.getByText(title)).toBeTruthy();
    }
    expect(screen.getByText('System default')).toBeTruthy();
    expect(screen.getByText('বাংলা')).toBeTruthy(); // voice language, independent of UI language

    await fireEvent.press(screen.getByText('Back up data'));
    await fireEvent.press(screen.getByText('Restore data'));
    await fireEvent.press(screen.getByText('Export transactions'));
    await fireEvent.press(screen.getByText('Voice recognition'));
    expect(jest.mocked(router.push).mock.calls.map((c) => c[0])).toEqual([
      '/settings/backup',
      '/settings/restore',
      '/settings/export',
      '/settings/voice',
    ]);
  });

  it('renders in Bengali after a live language switch', async () => {
    await renderScreen(<SettingsView />);
    await changeUiLanguage('bn');
    expect(await screen.findByText('ডেটা ব্যবস্থাপনা')).toBeTruthy();
    expect(screen.getByText('সব ডেটা মুছুন')).toBeTruthy();
  });

  it('clears data only after two confirmations', async () => {
    await addExpense();
    const alert = jest.spyOn(Alert, 'alert');
    await renderScreen(<SettingsView />);

    await fireEvent.press(screen.getByText('Clear all data'));
    expect(alert).toHaveBeenCalledTimes(1);
    expect((await dataRepository.counts()).transactions).toBe(1);

    pressAlertButton(alert, 'Continue');
    expect(alert).toHaveBeenCalledTimes(2);
    expect((await dataRepository.counts()).transactions).toBe(1);

    const version = useUiStore.getState().dataVersion;
    pressAlertButton(alert, 'Delete everything');
    await new Promise((r) => setTimeout(r, 10));
    expect(useUiStore.getState().toast?.message).toBe('All data cleared');
    expect((await dataRepository.counts()).transactions).toBe(0);
    expect(useUiStore.getState().dataVersion).toBeGreaterThan(version);
  });

  it('offers a backup before clearing', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    await renderScreen(<SettingsView />);
    await fireEvent.press(screen.getByText('Clear all data'));
    pressAlertButton(alert, 'Back up first');
    expect(router.push).toHaveBeenCalledWith('/settings/backup');
  });
});

describe('ThemeSelectView', () => {
  it('persists the selected theme and applies it', async () => {
    await renderScreen(<ThemeSelectView />);
    await fireEvent.press(screen.getByText('Dark'));
    await new Promise((r) => setTimeout(r, 0));
    expect(useSettingsStore.getState().themeMode).toBe('dark');
    expect(await settingsRepository.get('themeMode')).toBe('dark');
  });
});

describe('VoiceSettingsView', () => {
  function fakeEngine(overrides: Partial<SpeechEngine>): SpeechEngine {
    return {
      isAvailable: async () => true,
      getLocaleSupport: async () => 'network',
      getPermission: async () => 'granted',
      requestPermission: async () => 'granted',
      start: jest.fn(),
      stop: jest.fn(),
      abort: jest.fn(),
      subscribe: () => () => undefined,
      ...overrides,
    };
  }

  it('shows availability, permission and language support', async () => {
    setSpeechEngine(fakeEngine({}));
    await renderScreen(<VoiceSettingsView />);
    expect(await screen.findByText('Available')).toBeTruthy();
    expect(screen.getByText('Allowed')).toBeTruthy();
    expect(screen.getByText('Supported; may need internet')).toBeTruthy();
  });

  it('explains when recognition is unavailable and links to manual entry', async () => {
    setSpeechEngine(fakeEngine({ isAvailable: async () => false }));
    await renderScreen(<VoiceSettingsView />);
    expect(await screen.findByText('Voice entry is not available')).toBeTruthy();
    await fireEvent.press(screen.getByText('Add manually'));
    expect(router.push).toHaveBeenCalledWith('/transaction/new');
  });

  it('changes only the voice language', async () => {
    setSpeechEngine(fakeEngine({}));
    await renderScreen(<VoiceSettingsView />);
    await fireEvent.press(screen.getByText('हिन्दी'));
    await new Promise((r) => setTimeout(r, 0));
    expect(useSettingsStore.getState().voiceLanguage).toBe('hi');
    expect(useSettingsStore.getState().uiLanguage).toBe('en');
  });
});

describe('RestoreView', () => {
  async function backupText(): Promise<string> {
    await addExpense();
    const snapshot = await dataRepository.exportSnapshot();
    return serializeBackup(
      createBackupDocument(
        snapshot,
        { themeMode: 'dark' },
        { appVersion: '1.0.0', exportedAt: new Date(2026, 10, 12, 10) },
      ),
    );
  }

  it('previews counts and restores only after confirmation', async () => {
    const contents = await backupText();
    await dataRepository.clearUserData();
    jest.mocked(localBackupProvider.pick).mockResolvedValueOnce({ name: 'b.json', contents });
    const alert = jest.spyOn(Alert, 'alert');

    await renderScreen(<RestoreView />);
    await fireEvent.press(screen.getByText('Choose backup file'));

    expect(await screen.findByText('Backup contents')).toBeTruthy();
    expect(screen.getByText('b.json')).toBeTruthy();
    expect(screen.getByText('Your current data will be replaced')).toBeTruthy();
    expect((await dataRepository.counts()).transactions).toBe(0);

    await fireEvent.press(screen.getByText('Restore'));
    expect((await dataRepository.counts()).transactions).toBe(0); // nothing before confirming
    pressAlertButton(alert, 'Replace data');
    await new Promise((r) => setTimeout(r, 10));

    expect((await dataRepository.counts()).transactions).toBe(1);
    expect(useSettingsStore.getState().themeMode).toBe('dark');
    expect(router.back).toHaveBeenCalled();
  });

  it('shows a clear error for an invalid file and writes nothing', async () => {
    await addExpense();
    jest
      .mocked(localBackupProvider.pick)
      .mockResolvedValueOnce({ name: 'x.json', contents: 'not json' });
    await renderScreen(<RestoreView />);
    await fireEvent.press(screen.getByText('Choose backup file'));
    expect(await screen.findByText('This file is damaged or is not a backup file.')).toBeTruthy();
    expect(screen.queryByText('Restore')).toBeNull();
    expect((await dataRepository.counts()).transactions).toBe(1);
  });
});

describe('ExportCsvView', () => {
  it('reuses the Reports CSV export with its own period', async () => {
    const reportPeriod = useUiStore.getState().reportPeriod;
    await renderScreen(<ExportCsvView />);
    await fireEvent.press(screen.getByText('This year'));
    await fireEvent.press(screen.getByText('Export CSV'));
    expect(exportService.exportTransactionsCsv).toHaveBeenCalledWith({
      kind: 'year',
      year: new Date().getFullYear(),
    });
    expect(useUiStore.getState().reportPeriod).toEqual(reportPeriod);
  });

  it('exports a PDF when the PDF format is chosen', async () => {
    await renderScreen(<ExportCsvView />);
    await fireEvent.press(screen.getByText('PDF'));
    await fireEvent.press(screen.getByText('Export PDF'));
    expect(exportService.exportTransactionsPdf).toHaveBeenCalledTimes(1);
  });
});

describe('Help & Support', () => {
  it('is reachable from the More tab', async () => {
    await renderScreen(<MoreView />);
    await fireEvent.press(screen.getByText('Help & Support'));
    expect(router.push).toHaveBeenCalledWith('/help');
  });

  it('opens email and WhatsApp with the support contacts', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderScreen(<HelpView />);
    await fireEvent.press(screen.getByText('Email'));
    await fireEvent.press(screen.getByText('WhatsApp'));
    expect(openURL.mock.calls.map((c) => c[0])).toEqual([
      expect.stringMatching(/^mailto:technoriju@gmail\.com\?subject=/),
      'https://wa.me/919330882613',
    ]);
    expect(screen.getByText('Is my data uploaded anywhere?')).toBeTruthy();
  });
});
