import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
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

import { CategoryBreakdownView } from '../components/CategoryBreakdownView';
import { MonthlyCalendarView } from '../components/MonthlyCalendarView';
import { ReportsView } from '../components/ReportsView';

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

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const renderScreen = (ui: ReactElement) =>
  render(<SafeAreaProvider initialMetrics={METRICS}>{ui}</SafeAreaProvider>);

async function add(key: string, amountMinor: number, occurredOn: string): Promise<void> {
  const category = (await categoryRepository.listAll()).find((c) => c.key === key);
  if (!category) throw new Error(key);
  await transactionService.create({
    type: category.type,
    amountMinor,
    categoryId: category.id,
    occurredOn,
    note: null,
    paymentMethod: null,
  });
}

beforeEach(async () => {
  mockDb = await createMigratedTestDatabase();
  await changeUiLanguage('en');
  useSettingsStore.getState().applySettings({ uiLanguage: 'en' });
  useUiStore.getState().setReportPeriod({ kind: 'month', month: '2025-05-01' });
  jest.mocked(router.push).mockClear();
});

afterEach(() => {
  mockDb.close();
});

describe('ReportsView', () => {
  it('shows the empty state for a period without transactions', async () => {
    await renderScreen(<ReportsView />);
    expect(await screen.findByText('No transactions in this period')).toBeTruthy();
    expect(screen.getByText('May 2025')).toBeTruthy();
  });

  it('shows summary, net balance, breakdown, trend and comparison from SQLite', async () => {
    await add('salary', 7_500_000, '2025-05-01');
    await add('food', 1_620_000, '2025-05-03');
    await add('shopping', 1_234_000, '2025-05-10');
    await add('food', 100_000, '2025-04-10');
    await renderScreen(<ReportsView />);

    expect(await screen.findByText('Income minus expenses in this period')).toBeTruthy();
    expect(screen.getAllByText('₹75,000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₹28,540').length).toBeGreaterThan(0);
    expect(
      screen.getByLabelText('Net balance, +₹46,460. Income minus expenses in this period'),
    ).toBeTruthy();
    expect(screen.getByText('62%')).toBeTruthy(); // savings rate 61.95%
    expect(screen.getAllByText('Food').length).toBeGreaterThan(0);
    expect(screen.getByText('57%')).toBeTruthy();
    expect(screen.getByText('Daily trend')).toBeTruthy();
    expect(screen.getByText('Compared with previous period')).toBeTruthy();
    expect(screen.getByText('2,754% higher')).toBeTruthy(); // expenses vs ₹1,000 in April
  });

  it('steps to the previous month', async () => {
    await renderScreen(<ReportsView />);
    await screen.findByText('No transactions in this period');
    await fireEvent.press(screen.getByLabelText('Previous period'));
    expect(useUiStore.getState().reportPeriod).toEqual({ kind: 'month', month: '2025-04-01' });
    expect(await screen.findByText('April 2025')).toBeTruthy();
  });

  it('renders in Bengali', async () => {
    await add('food', 50_000, '2025-05-03');
    await act(async () => {
      await changeUiLanguage('bn');
      useSettingsStore.getState().applySettings({ uiLanguage: 'bn' });
    });
    await renderScreen(<ReportsView />);
    expect(await screen.findByText('এই সময়কালের আয় থেকে খরচ বাদ দিয়ে')).toBeTruthy();
    expect(screen.getByText('রিপোর্ট')).toBeTruthy();
    expect(screen.getByText('মে 2025')).toBeTruthy();
    expect(screen.getByText('কোনো আয় নেই')).toBeTruthy(); // savings rate without income
  });
});

describe('CategoryBreakdownView', () => {
  it('lists categories with counts and opens a category’s transactions', async () => {
    await add('food', 75_000, '2025-05-03');
    await add('food', 25_000, '2025-05-04');
    await add('bazar', 100_000, '2025-05-05');
    await renderScreen(<CategoryBreakdownView initialType="expense" />);

    expect(await screen.findByText('2 transactions')).toBeTruthy();
    expect(screen.getAllByText('50%')).toHaveLength(2);
    await fireEvent.press(screen.getByLabelText('Food, 50%, ₹1,000, 2 transactions'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/transactions',
      params: expect.objectContaining({
        type: 'expense',
        from: '2025-05-01',
        to: '2025-05-31',
      }),
    });
  });

  it('shows the income empty state', async () => {
    await add('food', 75_000, '2025-05-03');
    await renderScreen(<CategoryBreakdownView initialType="income" />);
    expect(await screen.findByText('No income in this period')).toBeTruthy();
  });
});

describe('MonthlyCalendarView', () => {
  it('shows the selected day’s summary and transactions', async () => {
    await add('food', 68_000, '2025-05-22');
    await renderScreen(<MonthlyCalendarView initialDate="2025-05-22" />);
    expect(await screen.findByText('Day Summary')).toBeTruthy();
    expect(screen.getByText('22 May 2025')).toBeTruthy();
    expect(await screen.findByText('Food')).toBeTruthy();
    expect(screen.getByText('-₹680')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('23 May 2025: no transactions'));
    expect(await screen.findByText('No transactions on this day')).toBeTruthy();
  });
});
