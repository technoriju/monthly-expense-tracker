import { useEffect, useState } from 'react';

import { reportService } from '@/features/reports/services/reportService';
import type { Trend } from '@/features/reports/types';
import { transactionService } from '@/features/transactions/services/transactionService';
import type { PeriodTotals, Transaction } from '@/features/transactions/types';
import { useUiStore } from '@/store/uiStore';

export const RECENT_TRANSACTIONS_LIMIT = 5;

export interface DashboardData {
  today: Date;
  month: Date;
  setMonth: (month: Date) => void;
  /** Last loaded totals (kept while a refetch is in flight); null before the first load. */
  summary: PeriodTotals | null;
  recentTransactions: Transaction[];
  /** Daily totals of the month for the trend chart; null before the first load. */
  trend: Trend | null;
  status: 'loading' | 'ready' | 'error';
  reload: () => void;
}

interface Loaded {
  key: string;
  summary: PeriodTotals | null;
  recent: Transaction[];
  trend: Trend | null;
  error: boolean;
}

/**
 * Dashboard data for the selected month: totals (integer paise) and recent transactions.
 * Refetches when the month changes or any transaction is written (`dataVersion`).
 */
export function useDashboardData(): DashboardData {
  const month = useUiStore((s) => s.selectedMonth);
  const setMonth = useUiStore((s) => s.setSelectedMonth);
  const dataVersion = useUiStore((s) => s.dataVersion);
  const [reloadToken, setReloadToken] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const key = `${month.getTime()}|${dataVersion}|${reloadToken}`;

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      transactionService.getMonthlyTotals(month),
      transactionService.listRecentForMonth(month, RECENT_TRANSACTIONS_LIMIT),
      reportService.getMonthTrend(month),
    ])
      .then(([summary, recent, trend]) => {
        if (!cancelled) setLoaded({ key, summary, recent, trend, error: false });
      })
      .catch((error: unknown) => {
        console.error('Loading dashboard failed', error);
        if (!cancelled) setLoaded({ key, summary: null, recent: [], trend: null, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [key, month]);

  const isCurrent = loaded?.key === key;
  const status: DashboardData['status'] = !isCurrent ? 'loading' : loaded.error ? 'error' : 'ready';

  return {
    today: new Date(),
    month,
    setMonth,
    summary: loaded?.summary ?? null,
    recentTransactions: loaded?.recent ?? [],
    trend: loaded?.trend ?? null,
    status,
    reload: () => setReloadToken((n) => n + 1),
  };
}
