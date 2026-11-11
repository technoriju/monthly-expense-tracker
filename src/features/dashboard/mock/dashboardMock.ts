/**
 * ⚠ MOCK DATA — dashboard UI preview only.
 *
 * Values mirror docs/design-reference.png. They are static constants, NOT calculated,
 * and must never be imported by services, repositories or the database layer.
 * Replace `useDashboardData` with real service calls when transaction storage lands;
 * then delete this file.
 */
import type { CategoryKey } from '@/features/categories/types';
import type { MinorAmount, TransactionType } from '@/types/money';

export interface MockSummary {
  incomeMinor: MinorAmount;
  expenseMinor: MinorAmount;
  remainingMinor: MinorAmount;
}

export interface MockRecentTransaction {
  id: string;
  type: TransactionType;
  amountMinor: MinorAmount;
  categoryKey: CategoryKey;
  daysAgo: number;
}

export const MOCK_SUMMARY: MockSummary = {
  incomeMinor: 7_500_000, // ₹75,000
  expenseMinor: 4_268_000, // ₹42,680
  remainingMinor: 3_232_000, // ₹32,320 (hard-coded, not computed)
};

export const MOCK_RECENT_TRANSACTIONS: readonly MockRecentTransaction[] = [
  { id: 'mock-1', type: 'expense', amountMinor: 50_000, categoryKey: 'bazar', daysAgo: 0 },
  { id: 'mock-2', type: 'expense', amountMinor: 20_000, categoryKey: 'dokan', daysAgo: 0 },
  { id: 'mock-3', type: 'income', amountMinor: 7_500_000, categoryKey: 'salary', daysAgo: 1 },
];
