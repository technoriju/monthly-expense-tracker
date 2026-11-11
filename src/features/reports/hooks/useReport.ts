import { useEffect, useState } from 'react';

import { useUiStore } from '@/store/uiStore';

import { reportService } from '../services/reportService';
import type { Report, ReportPeriod } from '../types';

export interface ReportData {
  period: ReportPeriod;
  setPeriod: (period: ReportPeriod) => void;
  /** Last loaded report (kept while a refetch is in flight); null before the first load. */
  report: Report | null;
  status: 'loading' | 'ready' | 'error';
  reload: () => void;
}

interface Loaded {
  key: string;
  report: Report | null;
  error: boolean;
}

/**
 * Report for the shared report period. Refetches when the period changes or any
 * transaction is written (`dataVersion`).
 */
export function useReport(): ReportData {
  const period = useUiStore((s) => s.reportPeriod);
  const setPeriod = useUiStore((s) => s.setReportPeriod);
  const dataVersion = useUiStore((s) => s.dataVersion);
  const [reloadToken, setReloadToken] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const key = `${JSON.stringify(period)}|${dataVersion}|${reloadToken}`;

  useEffect(() => {
    let cancelled = false;
    reportService
      .getReport(period)
      .then((report) => {
        if (!cancelled) setLoaded({ key, report, error: false });
      })
      .catch((error: unknown) => {
        console.error('Loading report failed', error);
        if (!cancelled) setLoaded({ key, report: null, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [key, period]);

  const isCurrent = loaded?.key === key;
  const status: ReportData['status'] = !isCurrent ? 'loading' : loaded.error ? 'error' : 'ready';

  return {
    period,
    setPeriod,
    report: loaded?.report ?? null,
    status,
    reload: () => setReloadToken((n) => n + 1),
  };
}
