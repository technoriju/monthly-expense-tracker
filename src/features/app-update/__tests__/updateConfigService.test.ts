import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { categoryRepository, settingsRepository, transactionRepository } from '@/database';
import {
  createMigratedTestDatabase,
  type TestDatabase,
} from '@/database/testing/createTestDatabase';
import { SETTING_KEYS } from '@/features/settings/types';

import { FETCH_TIMEOUT_MS, UPDATE_CONFIG_URL } from '../constants';
import { parseUpdateConfig } from '../schema';
import { getStoreUrl, openStore } from '../services/storeService';
import { updateConfigService } from '../services/updateConfigService';

let mockDb: TestDatabase;

jest.mock('@/database/client', () => ({
  getDatabase: async () => mockDb,
}));
jest.mock('expo-linking', () => ({ openURL: jest.fn() }));
jest.mock('expo-application', () => ({ applicationId: 'com.rijukarar.expensetracker' }));

const LIVE = {
  latestVersion: '1.2.0',
  minimumSupportedVersion: '1.1.0',
  forceUpdate: true,
  storeUrlAndroid: 'PLAY_STORE_URL',
  storeUrlIOS: 'APP_STORE_URL',
  releaseNotes: ['Improved receipt scanning'],
};

const fetchMock = jest.fn();

function respond(body: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (typeof body === 'string') throw new SyntaxError('Unexpected token');
      return body;
    },
  });
}

/** Every user-data table, to prove update checks never touch them. */
async function snapshotUserData() {
  const tables = ['transactions', 'categories', 'budgets', 'receipts', 'receipt_items'];
  const out: Record<string, unknown[]> = {};
  for (const table of tables) out[table] = await mockDb.getAllAsync(`SELECT * FROM ${table}`);
  return out;
}

beforeEach(async () => {
  mockDb = await createMigratedTestDatabase();
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  const food = (await categoryRepository.listAll()).find((c) => c.key === 'food');
  if (!food) throw new Error('seed');
  await transactionRepository.insert(
    {
      type: 'expense',
      amountMinor: 12_550,
      currency: 'INR',
      categoryId: food.id,
      occurredOn: '2026-11-01',
      note: 'বাজার',
      paymentMethod: 'upi',
      source: 'manual',
    },
    1_000,
  );
});

afterEach(() => {
  mockDb.close();
  jest.useRealTimers();
});

describe('updateConfigService.fetchRemote', () => {
  it('fetches the configured URL anonymously and validates the file', async () => {
    respond(LIVE);
    const result = await updateConfigService.fetchRemote();
    expect(result).toMatchObject({ ok: true, config: { latestVersion: '1.2.0' } });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^${UPDATE_CONFIG_URL.replace(/\./g, '\\.')}\\?t=\\d+$`)),
      expect.objectContaining({
        method: 'GET',
        headers: { Accept: 'application/json', 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      }),
    );
  });

  it('shares one request between concurrent calls', async () => {
    respond(LIVE);
    const [a, b] = await Promise.all([
      updateConfigService.fetchRemote(),
      updateConfigService.fetchRemote(),
    ]);
    expect(a).toBe(b);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['network failure', () => fetchMock.mockRejectedValueOnce(new TypeError('Network'))],
    ['server error', () => respond({}, 503)],
  ])('reports %s as offline', async (_name, arrange) => {
    arrange();
    await expect(updateConfigService.fetchRemote()).resolves.toEqual({
      ok: false,
      error: 'offline',
    });
  });

  it.each([
    ['not found', () => respond({}, 404)],
    ['broken JSON', () => respond('<html>')],
    ['invalid schema', () => respond({ latestVersion: 'soon' })],
  ])('reports %s as invalid', async (_name, arrange) => {
    arrange();
    await expect(updateConfigService.fetchRemote()).resolves.toEqual({
      ok: false,
      error: 'invalid',
    });
  });

  it('gives up after the timeout', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementationOnce(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(new Error('Aborted')));
        }),
    );
    const pending = updateConfigService.fetchRemote();
    jest.advanceTimersByTime(FETCH_TIMEOUT_MS);
    await expect(pending).resolves.toEqual({ ok: false, error: 'offline' });
  });
});

describe('update policy cache', () => {
  it('round-trips through the settings table and leaves user data untouched', async () => {
    const before = await snapshotUserData();
    const config = parseUpdateConfig(LIVE);
    if (!config) throw new Error('fixture');

    await updateConfigService.saveCache({ config, checkedAt: 123 });
    await updateConfigService.saveDismissedVersion('1.2.0');
    respond({}, 503);
    await updateConfigService.fetchRemote();

    await expect(updateConfigService.loadCache()).resolves.toEqual({ config, checkedAt: 123 });
    await expect(updateConfigService.loadDismissedVersion()).resolves.toBe('1.2.0');
    expect(await snapshotUserData()).toEqual(before);
    expect((before.transactions ?? []).length).toBe(1);
  });

  it('ignores a missing or corrupt cache', async () => {
    await expect(updateConfigService.loadCache()).resolves.toBeNull();
    await settingsRepository.set(SETTING_KEYS.updatePolicyCache, {
      config: { x: 1 },
      checkedAt: 1,
    });
    await expect(updateConfigService.loadCache()).resolves.toBeNull();
    await settingsRepository.set(SETTING_KEYS.updatePolicyCache, 'garbage');
    await expect(updateConfigService.loadCache()).resolves.toBeNull();
    await settingsRepository.set(SETTING_KEYS.updatePolicyCache, {
      config: LIVE,
      checkedAt: 'yesterday',
    });
    await expect(updateConfigService.loadCache()).resolves.toBeNull();
  });
});

describe('storeService', () => {
  const withLinks = parseUpdateConfig({
    ...LIVE,
    storeUrlAndroid: 'https://play.google.com/store/apps/details?id=x',
    storeUrlIOS: 'https://apps.apple.com/app/id1',
  });
  const placeholders = parseUpdateConfig(LIVE);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the Android link, or the Play listing for this package', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    expect(getStoreUrl(withLinks)).toBe('https://play.google.com/store/apps/details?id=x');
    expect(getStoreUrl(placeholders)).toBe(
      'https://play.google.com/store/apps/details?id=com.rijukarar.expensetracker',
    );
  });

  it('uses the iOS link, and has none without one', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    expect(getStoreUrl(withLinks)).toBe('https://apps.apple.com/app/id1');
    expect(getStoreUrl(placeholders)).toBeNull();
  });

  it('opens the store, and reports when it cannot', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const openURL = jest.mocked(Linking.openURL);
    openURL.mockResolvedValueOnce(true);
    await expect(openStore(withLinks)).resolves.toBe('opened');
    expect(openURL).toHaveBeenCalledWith('https://apps.apple.com/app/id1');

    openURL.mockRejectedValueOnce(new Error('No app'));
    await expect(openStore(withLinks)).resolves.toBe('unavailable');
    await expect(openStore(placeholders)).resolves.toBe('unavailable');
  });
});
