import { categoryRepository, transactionRepository } from '@/database';
import {
  createMigratedTestDatabase,
  type TestDatabase,
} from '@/database/testing/createTestDatabase';
import { i18n } from '@/i18n';
import { useSettingsStore } from '@/store/settingsStore';
import { useUiStore } from '@/store/uiStore';

import { parseBackup } from '../backupValidation';
import { localBackupProvider, type BackupFile } from '../providers';
import { backupService } from '../services/backupService';
import { resetService } from '../services/resetService';
import { restoreService } from '../services/restoreService';

let mockDb: TestDatabase;

jest.mock('@/database/client', () => ({
  getDatabase: async () => mockDb,
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
}));

jest.mock('../providers', () => ({
  localBackupProvider: { save: jest.fn(async () => 'saved'), pick: jest.fn() },
}));

beforeEach(async () => {
  mockDb = await createMigratedTestDatabase();
  useSettingsStore.getState().applySettings({
    uiLanguage: 'bn',
    voiceLanguage: 'en',
    themeMode: 'dark',
    currency: 'INR',
  });
});

afterEach(() => {
  mockDb.close();
});

async function addExpense(note: string): Promise<void> {
  const food = (await categoryRepository.listAll()).find((c) => c.key === 'food');
  await transactionRepository.insert({
    type: 'expense',
    amountMinor: 45_050,
    currency: 'INR',
    categoryId: food!.id,
    occurredOn: '2026-11-03',
    note,
    paymentMethod: 'cash',
    source: 'manual',
  });
}

describe('backup → clear → restore', () => {
  it('restores identical data and the backed-up preferences', async () => {
    await addExpense('দোকান থেকে চাল');
    const file = await backupService.createBackupFile(new Date('2026-11-12T10:00:00Z'));
    const parsed = parseBackup(file.contents);
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.backup.settings).toEqual({
      uiLanguage: 'bn',
      voiceLanguage: 'en',
      themeMode: 'dark',
      currency: 'INR',
    });

    await resetService.clearAllData();
    expect((await restoreService.currentCounts()).transactions).toBe(0);
    useSettingsStore.getState().applySettings({ uiLanguage: 'en', themeMode: 'light' });

    const version = useUiStore.getState().dataVersion;
    await restoreService.restore(parsed.backup);

    const [tx] = await transactionRepository.list({}, { limit: 10, offset: 0 });
    expect(tx).toEqual(
      expect.objectContaining({
        amountMinor: 45_050,
        occurredOn: '2026-11-03',
        note: 'দোকান থেকে চাল',
      }),
    );
    expect(tx?.category.key).toBe('food');
    expect(useSettingsStore.getState()).toEqual(
      expect.objectContaining({ uiLanguage: 'bn', themeMode: 'dark', voiceLanguage: 'en' }),
    );
    expect(i18n.language).toBe('bn');
    expect(useUiStore.getState().dataVersion).toBeGreaterThan(version);
  });

  it('exports through the local provider with a JSON file', async () => {
    await backupService.exportBackup('share');
    const save = localBackupProvider.save as jest.Mock;
    const [file, destination] = save.mock.calls[0] as [BackupFile, string];
    expect(destination).toBe('share');
    expect(file.mimeType).toBe('application/json');
    expect(file.name).toMatch(/^expense-tracker-backup_\d{4}-\d{2}-\d{2}_\d{4}\.json$/);
  });

  it('reports an invalid picked file without touching data', async () => {
    await addExpense('keep me');
    (localBackupProvider.pick as jest.Mock).mockResolvedValueOnce({
      name: 'x.json',
      contents: '{"format":"monthly-expense-tracker-backup","schemaVersion":9}',
    });
    expect(await restoreService.pickBackup()).toEqual({
      status: 'invalid',
      error: 'unsupportedVersion',
    });
    expect((await restoreService.currentCounts()).transactions).toBe(1);
  });

  it('returns cancelled when no file is chosen', async () => {
    (localBackupProvider.pick as jest.Mock).mockResolvedValueOnce(null);
    expect(await restoreService.pickBackup()).toEqual({ status: 'cancelled' });
  });
});

describe('resetService.clearAllData', () => {
  it('clears data, keeps preferences and refreshes screens', async () => {
    await addExpense('x');
    const version = useUiStore.getState().dataVersion;
    await resetService.clearAllData();
    expect(await restoreService.currentCounts()).toEqual(
      expect.objectContaining({ transactions: 0, budgets: 0 }),
    );
    expect((await restoreService.currentCounts()).categories).toBeGreaterThan(0);
    expect(useSettingsStore.getState().uiLanguage).toBe('bn');
    expect(useUiStore.getState().dataVersion).toBe(version + 1);
  });
});
