import { useEffect, useMemo, useRef, useState } from 'react';

import { useUiStore } from '@/store/uiStore';

import { groupByDate } from '../grouping';
import { transactionService } from '../services/transactionService';
import type { Transaction, TransactionFilter } from '../types';

export const HISTORY_PAGE_SIZE = 30;
const SEARCH_DEBOUNCE_MS = 300;
const NO_ITEMS: Transaction[] = [];

interface Loaded {
  key: string;
  items: Transaction[];
  hasMore: boolean;
  error: boolean;
}

/**
 * Paginated, filtered transaction history. Reloads the first page whenever the filter
 * changes or any transaction is written (`dataVersion`); previous rows stay visible
 * while the reload is in flight.
 */
export function useTransactionHistory(filter: TransactionFilter) {
  const dataVersion = useUiStore((s) => s.dataVersion);
  const [reloadToken, setReloadToken] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestId = useRef(0);

  // Debounce only the free-text search; other filters apply immediately.
  const [search, setSearch] = useState(filter.search ?? '');
  useEffect(() => {
    const timer = setTimeout(() => setSearch(filter.search ?? ''), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filter.search]);

  const { type, categoryIds, dateFrom, dateTo, sort } = filter;
  const effective = useMemo<TransactionFilter>(
    () => ({ type, categoryIds, dateFrom, dateTo, sort, search }),
    [type, categoryIds, dateFrom, dateTo, sort, search],
  );
  const key = `${JSON.stringify(effective)}|${dataVersion}|${reloadToken}`;

  const fetchFirstPage = (forKey: string): Promise<Loaded> =>
    transactionService
      .list(effective, { limit: HISTORY_PAGE_SIZE, offset: 0 })
      .then((items) => ({
        key: forKey,
        items,
        hasMore: items.length === HISTORY_PAGE_SIZE,
        error: false,
      }))
      .catch((error: unknown) => {
        console.error('Loading transactions failed', error);
        return { key: forKey, items: [], hasMore: false, error: true };
      });

  useEffect(() => {
    const id = ++requestId.current;
    void fetchFirstPage(key).then((result) => {
      if (id === requestId.current) setLoaded(result);
    });
    // `key` encodes every input of fetchFirstPage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const isCurrent = loaded?.key === key;
  const items = loaded?.items ?? NO_ITEMS;
  const status: 'loading' | 'ready' | 'error' = !isCurrent
    ? 'loading'
    : loaded.error
      ? 'error'
      : 'ready';

  const refresh = async () => {
    setRefreshing(true);
    const id = ++requestId.current;
    const result = await fetchFirstPage(key);
    if (id === requestId.current) setLoaded(result);
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (!isCurrent || !loaded.hasMore || loadingMore) return;
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const page = await transactionService.list(effective, {
        limit: HISTORY_PAGE_SIZE,
        offset: loaded.items.length,
      });
      if (id !== requestId.current) return;
      setLoaded({
        ...loaded,
        items: [...loaded.items, ...page],
        hasMore: page.length === HISTORY_PAGE_SIZE,
      });
    } catch (error) {
      console.error('Loading more transactions failed', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const groups = useMemo(() => groupByDate(items), [items]);

  return {
    groups,
    hasItems: items.length > 0,
    status,
    refreshing,
    loadingMore,
    refresh,
    retry: () => setReloadToken((n) => n + 1),
    loadMore,
  };
}
