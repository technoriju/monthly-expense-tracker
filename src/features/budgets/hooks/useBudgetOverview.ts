import { useEffect, useState } from 'react';

import { useUiStore } from '@/store/uiStore';

import { budgetService } from '../services/budgetService';
import type { MonthBudgetOverview } from '../types';

export interface BudgetOverviewState {
  /** Last loaded overview (kept while a refetch is in flight); null before the first load. */
  overview: MonthBudgetOverview | null;
  status: 'loading' | 'ready' | 'error';
  reload: () => void;
}

interface Loaded {
  key: string;
  overview: MonthBudgetOverview | null;
  error: boolean;
}

/**
 * Budgets vs actual spending for `month`. Refetches when the month changes or any
 * transaction or budget is written (`dataVersion`), so progress and alerts stay current.
 */
export function useBudgetOverview(month: Date): BudgetOverviewState {
  const dataVersion = useUiStore((s) => s.dataVersion);
  const [reloadToken, setReloadToken] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const key = `${month.getTime()}|${dataVersion}|${reloadToken}`;

  useEffect(() => {
    let cancelled = false;
    budgetService
      .getMonthOverview(month)
      .then((overview) => {
        if (!cancelled) setLoaded({ key, overview, error: false });
      })
      .catch((error: unknown) => {
        console.error('Loading budgets failed', error);
        if (!cancelled) setLoaded({ key, overview: null, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [key, month]);

  const isCurrent = loaded?.key === key;
  return {
    overview: loaded?.overview ?? null,
    status: !isCurrent ? 'loading' : loaded.error ? 'error' : 'ready',
    reload: () => setReloadToken((n) => n + 1),
  };
}
