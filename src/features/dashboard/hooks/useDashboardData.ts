import { subDays } from 'date-fns';

import type { TransactionPreview } from '@/features/transactions/types';
import { toIsoDate } from '@/utils/dates';

import { MOCK_RECENT_TRANSACTIONS, MOCK_SUMMARY, type MockSummary } from '../mock/dashboardMock';

export interface DashboardData {
  today: Date;
  month: Date;
  summary: MockSummary;
  recentTransactions: TransactionPreview[];
  isMock: true;
}

/**
 * Dashboard data source. Currently returns MOCK data (see ../mock/dashboardMock.ts).
 * Will be backed by transaction/report services once transaction storage exists.
 */
export function useDashboardData(): DashboardData {
  const today = new Date();
  return {
    today,
    month: today,
    summary: MOCK_SUMMARY,
    recentTransactions: MOCK_RECENT_TRANSACTIONS.map(({ daysAgo, ...tx }) => ({
      ...tx,
      occurredOn: toIsoDate(subDays(today, daysAgo)),
    })),
    isMock: true,
  };
}
