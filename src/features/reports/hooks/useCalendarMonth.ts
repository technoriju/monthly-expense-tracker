import { useEffect, useState } from 'react';

import type { Transaction } from '@/features/transactions/types';
import { useUiStore } from '@/store/uiStore';
import type { IsoDate } from '@/utils/dates';

import { reportService } from '../services/reportService';
import type { CalendarMonth } from '../types';

type Status = 'loading' | 'ready' | 'error';

interface Loaded<T> {
  key: string;
  value: T | null;
  error: boolean;
}

/** Loads `load()` whenever `key` changes; keeps the previous value while reloading. */
function useKeyedLoad<T>(key: string, load: () => Promise<T>, what: string) {
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);
  useEffect(() => {
    let cancelled = false;
    load()
      .then((value) => {
        if (!cancelled) setLoaded({ key, value, error: false });
      })
      .catch((error: unknown) => {
        console.error(`Loading ${what} failed`, error);
        if (!cancelled) setLoaded({ key, value: null, error: true });
      });
    return () => {
      cancelled = true;
    };
    // `key` encodes every input of `load`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const status: Status = loaded?.key !== key ? 'loading' : loaded.error ? 'error' : 'ready';
  return { value: loaded?.value ?? null, status };
}

/** Calendar grid with daily totals for `month`, plus the transactions of `selectedDate`. */
export function useCalendarMonth(month: Date, selectedDate: IsoDate) {
  const dataVersion = useUiStore((s) => s.dataVersion);
  const [reloadToken, setReloadToken] = useState(0);
  const monthKey = `${month.getTime()}|${dataVersion}|${reloadToken}`;
  const dayKey = `${selectedDate}|${dataVersion}|${reloadToken}`;

  const calendar = useKeyedLoad<CalendarMonth>(
    monthKey,
    () => reportService.getCalendarMonth(month),
    'calendar',
  );
  const day = useKeyedLoad<Transaction[]>(
    dayKey,
    () => reportService.getDayTransactions(selectedDate),
    'day transactions',
  );

  return {
    calendar: calendar.value,
    calendarStatus: calendar.status,
    dayTransactions: day.value ?? [],
    dayStatus: day.status,
    reload: () => setReloadToken((n) => n + 1),
  };
}
