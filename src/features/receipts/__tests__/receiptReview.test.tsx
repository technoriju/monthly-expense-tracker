import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { categoryRepository } from '@/database';
import {
  createMigratedTestDatabase,
  type TestDatabase,
} from '@/database/testing/createTestDatabase';
import { changeUiLanguage } from '@/i18n';
import { useReceiptDraftStore } from '@/store/receiptDraftStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useUiStore } from '@/store/uiStore';

import { ReceiptReviewView } from '../components/ReceiptReviewView';
import { createReceiptDraft } from '../draft';
import * as F from '../parser/__fixtures__/receiptFixtures';
import { parseReceipt } from '../parser/receiptParser';

let mockDb: TestDatabase;

jest.mock('@/database/client', () => ({
  getDatabase: async () => mockDb,
}));

jest.mock(
  'lucide-react-native',
  () => new Proxy({}, { get: (_target, name) => (name === '__esModule' ? false : () => null) }),
);

jest.mock('expo-image', () => ({ Image: () => null }));

jest.mock('../services/receiptImageStore', () => ({
  receiptImageStore: {
    uriOf: () => null,
    delete: jest.fn(),
    sweep: jest.fn(),
    deleteAll: jest.fn(),
    writeDraft: async () => {},
    readDraft: async () => null,
    clearDraft: jest.fn(),
  },
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() },
}));

const TODAY = new Date(2025, 4, 22);
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const count = async (table: string) =>
  (await mockDb.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`))?.n;

async function renderReview(text: string | null, categoryName = 'Food') {
  const food = (await categoryRepository.listAll()).find((c) => c.key === 'food');
  const parsed = text === null ? null : parseReceipt(F.lines(text), { today: TODAY });
  const draft = createReceiptDraft({
    id: 'rtest0001',
    imageFile: null,
    parsed,
    ocrProvider: parsed ? 'mlkit' : null,
    currency: 'INR',
    today: TODAY,
  });
  useReceiptDraftStore
    .getState()
    .setDraft({ ...draft, form: { ...draft.form, categoryId: food!.id } });
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ReceiptReviewView />
    </SafeAreaProvider>,
  );
  await waitFor(() =>
    expect(screen.getByRole('radio', { name: categoryName, checked: true })).toBeTruthy(),
  );
}

const saveButton = () => screen.getByTestId('receipt-save');

beforeEach(async () => {
  mockDb = await createMigratedTestDatabase();
  await changeUiLanguage('en');
  useSettingsStore.getState().applySettings({ uiLanguage: 'en' });
  useReceiptDraftStore.getState().clearDraft();
  useUiStore.setState({ toast: null });
  jest.clearAllMocks();
});

afterEach(() => {
  mockDb.close();
});

describe('Receipt review', () => {
  it('pre-fills shop, items and amount, and saves nothing before confirmation', async () => {
    await renderReview(F.PRINTED_RESTAURANT);
    expect(screen.getByLabelText('Shop name')).toHaveDisplayValue('Hotel Annapurna');
    expect(screen.getByText('Paneer Butter Masala')).toBeTruthy();
    expect(screen.getByLabelText('Amount')).toHaveDisplayValue('398');
    expect(await count('transactions')).toBe(0);
  });

  it('saves an itemized receipt as one expense with its items', async () => {
    await renderReview(F.PRINTED_RESTAURANT);
    await fireEvent.press(saveButton());
    await waitFor(async () => expect(await count('receipts')).toBe(1));
    expect(await count('transactions')).toBe(1);
    expect(await count('receipt_items')).toBe(2);
    const tx = await mockDb.getFirstAsync<{ amount_minor: number }>(
      'SELECT amount_minor FROM transactions',
    );
    expect(tx?.amount_minor).toBe(39_800);
    expect(useReceiptDraftStore.getState().draft).toBeNull();
    expect(useUiStore.getState().toast?.message).toBe('Receipt saved');
    expect(router.dismissTo).toHaveBeenCalledWith('/');
  });

  it('requires an explicit check when totals are ambiguous, then saves the chosen total', async () => {
    await renderReview(F.MULTIPLE_TOTALS);
    expect(screen.getByLabelText('Amount')).toHaveDisplayValue('');
    expect(screen.getByText(/Several different totals were found/)).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Amount'), '420');
    await fireEvent.press(saveButton());
    expect(await screen.findByText("Tick “I've checked the amount” to save.")).toBeTruthy();
    expect(await count('transactions')).toBe(0);

    await fireEvent.press(screen.getByRole('checkbox', { name: "I've checked the amount" }));
    await fireEvent.press(saveButton());
    await waitFor(async () => expect(await count('transactions')).toBe(1));
    const tx = await mockDb.getFirstAsync<{ amount_minor: number }>(
      'SELECT amount_minor FROM transactions',
    );
    expect(tx?.amount_minor).toBe(42_000);
  });

  it('fills the amount from a chosen total', async () => {
    await renderReview(F.MULTIPLE_TOTALS);
    // The total chip, not the item row (whose label starts with the item name).
    await fireEvent.press(screen.getByRole('button', { name: /^₹\s?350/ }));
    expect(screen.getByLabelText('Amount')).toHaveDisplayValue('350');
  });

  it('saves a total-only receipt and keeps an unreadable item name empty', async () => {
    await renderReview(F.HANDWRITTEN_NOISY);
    expect(screen.getAllByText('Unreadable item').length).toBeGreaterThan(0);
    await fireEvent.press(saveButton());
    await waitFor(async () => expect(await count('receipts')).toBe(1));
    const names = await mockDb.getAllAsync<{ item_name: string | null }>(
      'SELECT item_name FROM receipt_items ORDER BY position',
    );
    expect(names.map((n) => n.item_name)).toEqual([null, 'Sugr', null]);
  });

  it('lets the user type everything for a receipt that could not be read', async () => {
    await renderReview(null);
    await fireEvent.press(saveButton());
    expect(await screen.findByText('Enter an amount')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Amount'), '250');
    await fireEvent.press(saveButton());
    await waitFor(async () => expect(await count('transactions')).toBe(1));
    expect(await count('receipt_items')).toBe(0);
  });

  it('shows the review in Bengali', async () => {
    await changeUiLanguage('bn');
    await renderReview(F.TOTAL_ONLY, 'খাবার');
    expect(screen.getByText('রসিদ যাচাই')).toBeTruthy();
    expect(screen.getByText('খরচ সেভ করুন')).toBeTruthy();
  });
});
