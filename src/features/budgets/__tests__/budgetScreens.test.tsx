import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { categoryRepository } from '@/database';
import {
  createMigratedTestDatabase,
  type TestDatabase,
} from '@/database/testing/createTestDatabase';
import { DashboardView } from '@/features/dashboard/components/DashboardView';
import { transactionService } from '@/features/transactions/services/transactionService';
import { changeUiLanguage } from '@/i18n';
import { useSettingsStore } from '@/store/settingsStore';
import { useUiStore } from '@/store/uiStore';

import { BudgetSummaryCard } from '../components/BudgetSummaryCard';
import { BudgetView } from '../components/BudgetView';
import { budgetService } from '../services/budgetService';

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

const MAY = new Date(2025, 4, 1);

async function idOf(key: string): Promise<number> {
  const found = (await categoryRepository.listAll()).find((c) => c.key === key);
  if (!found) throw new Error(key);
  return found.id;
}

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
  useUiStore.getState().setSelectedMonth(MAY);
  jest.mocked(router.push).mockClear();
});

afterEach(() => {
  mockDb.close();
  jest.restoreAllMocks();
});

describe('BudgetView', () => {
  it('shows the empty state for a month without budgets', async () => {
    await renderScreen(<BudgetView initialMonth={MAY} />);
    expect(await screen.findByText('No budgets for this month')).toBeTruthy();
    expect(screen.getByText('May 2025')).toBeTruthy();
    expect(screen.getByText('Set monthly budget')).toBeTruthy();
  });

  it('creates an overall budget through the editor and persists it', async () => {
    await add('food', 85_000, '2025-05-03');
    await renderScreen(<BudgetView initialMonth={MAY} />);
    await fireEvent.press(await screen.findByLabelText('Set monthly budget'));
    await fireEvent.changeText(screen.getByLabelText('Budget amount'), '1,000');
    await fireEvent.press(screen.getByLabelText('Save'));

    expect(await screen.findByText('Monthly budget')).toBeTruthy();
    expect(screen.getByText('₹1,000')).toBeTruthy();
    expect(screen.getByText('85% used')).toBeTruthy();
    expect(screen.getByText('Approaching limit')).toBeTruthy();
    expect(screen.getByText('You have used 85% of your monthly budget.')).toBeTruthy();
    const stored = await budgetService.getMonthOverview(MAY);
    expect(stored.overall.budgetMinor).toBe(100_000);
  });

  it('shows a validation error for an empty amount', async () => {
    await renderScreen(<BudgetView initialMonth={MAY} />);
    await fireEvent.press(await screen.findByLabelText('Set monthly budget'));
    await fireEvent.press(screen.getByLabelText('Save'));
    expect(await screen.findByText('Enter a budget amount')).toBeTruthy();
  });

  it('offers 6 categories plus "Other" (no Add tile) and defaults "Other" to selected', async () => {
    await renderScreen(<BudgetView initialMonth={MAY} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Add category budget' }));

    expect(screen.getAllByRole('radio')).toHaveLength(7);
    expect(screen.queryByText('Add')).toBeNull();
    await fireEvent.press(screen.getByRole('radio', { name: 'Other' }));
    expect(screen.getByText('Choose category')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Budget amount'), '500');
    await fireEvent.press(screen.getByLabelText('Save'));
    await screen.findByText('Category budgets');
    const stored = await budgetService.getMonthOverview(MAY);
    expect(stored.categories.map((c) => c.category.key)).toEqual(['other_expense']);
  });

  it('shows exceeded category budgets, warnings and unbudgeted spending', async () => {
    await budgetService.create({
      budgetType: 'category',
      categoryId: await idOf('food'),
      month: MAY,
      amountMinor: 50_000,
    });
    await add('food', 60_000, '2025-05-03');
    await add('bazar', 20_000, '2025-05-04');
    await renderScreen(<BudgetView initialMonth={MAY} />);

    expect(await screen.findByText('Food budget exceeded: 120% used.')).toBeTruthy();
    expect(screen.getByText('Budget exceeded')).toBeTruthy();
    expect(screen.getByText('₹100 over budget')).toBeTruthy();
    expect(screen.getByText('Spending without a budget')).toBeTruthy();
    expect(screen.getByText('Bazar')).toBeTruthy();
  });

  it('deletes a budget only after confirmation', async () => {
    await budgetService.create({
      budgetType: 'overall',
      categoryId: null,
      month: MAY,
      amountMinor: 100_000,
    });
    const alert = jest.spyOn(Alert, 'alert');
    await renderScreen(<BudgetView initialMonth={MAY} />);
    await fireEvent.press(await screen.findByLabelText('Delete monthly budget'));

    expect(alert).toHaveBeenCalledTimes(1);
    expect((await budgetService.getMonthOverview(MAY)).overallBudget).not.toBeNull();
    const buttons = alert.mock.calls[0]?.[2] ?? [];
    await act(async () => {
      buttons.find((b) => b.style === 'destructive')?.onPress?.();
    });
    expect(await screen.findByText('No budgets for this month')).toBeTruthy();
    expect((await budgetService.getMonthOverview(MAY)).overallBudget).toBeNull();
  });

  it('shows a previous month’s budget unchanged (history)', async () => {
    await budgetService.create({
      budgetType: 'overall',
      categoryId: null,
      month: new Date(2025, 3, 1),
      amountMinor: 300_000,
    });
    await renderScreen(<BudgetView initialMonth={new Date(2025, 3, 1)} />);
    expect(await screen.findAllByText('₹3,000')).toHaveLength(2); // budget + remaining
    expect(screen.getByText('April 2025')).toBeTruthy();
  });

  it('renders in Bengali', async () => {
    await budgetService.create({
      budgetType: 'overall',
      categoryId: null,
      month: MAY,
      amountMinor: 100_000,
    });
    await add('food', 95_000, '2025-05-03');
    await act(async () => {
      await changeUiLanguage('bn');
      useSettingsStore.getState().applySettings({ uiLanguage: 'bn' });
    });
    await renderScreen(<BudgetView initialMonth={MAY} />);
    expect(await screen.findByText('মাসিক বাজেট')).toBeTruthy();
    expect(screen.getByText('বাজেট')).toBeTruthy();
    expect(screen.getByText('সীমার কাছাকাছি')).toBeTruthy();
    expect(screen.getByText('মাসিক বাজেটের 95% ব্যবহৃত। আপনি সীমার খুব কাছে।')).toBeTruthy();
  });
});

describe('BudgetSummaryCard', () => {
  it('opens the Budget screen for its month', async () => {
    await renderScreen(<BudgetSummaryCard month={MAY} />);
    await fireEvent.press(await screen.findByText('Track your spending against a limit.'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/budgets',
      params: { month: '2025-05' },
    });
  });

  it('is hidden on the dashboard until a budget exists, then matches the Budget screen', async () => {
    await add('food', 120_000, '2025-05-03');
    await add('salary', 5_000_000, '2025-05-01'); // income is not budget spending
    const view = await renderScreen(<DashboardView />);
    await screen.findByText('Recent Transactions');
    expect(screen.queryByText('Monthly budget')).toBeNull();
    view.unmount();

    await budgetService.create({
      budgetType: 'overall',
      categoryId: null,
      month: MAY,
      amountMinor: 100_000,
    });
    await renderScreen(<DashboardView />);
    expect(await screen.findByText('Monthly budget')).toBeTruthy();
    expect(screen.getByText('₹200 over budget')).toBeTruthy();
    expect(screen.getByText('120% used')).toBeTruthy();
    expect(screen.getByText('1 budget warning')).toBeTruthy();
  });
});
