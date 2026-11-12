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
  /** Filter part of `key` (without dataVersion), to keep the loaded depth after writes. */
  filterKey: string;
  items: Transaction[];
  hasMore: boolean;
  error: boolean;
}

/**
 * Paginated, filtered transaction history. Reloads from the first page whenever the filter
 * changes; after a write (`dataVersion`) it reloads as many rows as were already loaded, so
 * the list keeps its scroll depth. Previous rows stay visible while a reload is in flight.
 */
export function useTransactionHistory(filter: TransactionFilter) {
  const dataVersion = useUiStore((s) => s.dataVersion);
  const [reloadToken, setReloadToken] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  /** `key` whose next page failed to load; a new key (filter or data change) clears it. */
  const [loadMoreFailedKey, setLoadMoreFailedKey] = useState<string | null>(null);
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
  const filterKey = `${JSON.stringify(effective)}|${reloadToken}`;
  const key = `${filterKey}|${dataVersion}`;

  const fetchFirstPage = (forKey: string, limit = HISTORY_PAGE_SIZE): Promise<Loaded> =>
    transactionService
      .list(effective, { limit, offset: 0 })
      .then((items) => ({
        key: forKey,
        filterKey,
        items,
        hasMore: items.length === limit,
        error: false,
      }))
      .catch((error: unknown) => {
        console.error('Loading transactions failed', error);
        return { key: forKey, filterKey, items: [], hasMore: false, error: true };
      });

  useEffect(() => {
    const id = ++requestId.current;
    // Same filter, new data: reload the rows already shown instead of resetting to page 1.
    const depth =
      loaded?.filterKey === filterKey && !loaded.error
        ? Math.max(HISTORY_PAGE_SIZE, loaded.items.length)
        : HISTORY_PAGE_SIZE;
    void fetchFirstPage(key, depth).then((result) => {
      if (id === requestId.current) setLoaded(result);
    });
    // `key` encodes every input of fetchFirstPage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const isCurrent = loaded?.key === key;
  const loadMoreFailed = loadMoreFailedKey === key;
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

  /** Next page. After a failure only an explicit retry (`force`) tries again. */
  const loadMore = async (force = false) => {
    if (!isCurrent || !loaded.hasMore || loadingMore) return;
    if (loadMoreFailed && !force) return;
    const id = requestId.current;
    setLoadingMore(true);
    setLoadMoreFailedKey(null);
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
      if (id === requestId.current) setLoadMoreFailedKey(key);
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
    loadMoreFailed,
    refresh,
    retry: () => setReloadToken((n) => n + 1),
    loadMore,
  };
}
