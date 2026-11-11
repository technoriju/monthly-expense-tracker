import { useLocalSearchParams } from 'expo-router';

import {
  TransactionHistoryView,
  type TransactionHistoryInitialFilter,
} from '@/features/transactions/components/TransactionHistoryView';
import { isIsoDate } from '@/utils/dates';

type Params = { type?: string; categoryId?: string; from?: string; to?: string };

/** Optional params pre-filter the list, e.g. `/transactions?categoryId=3&from=…&to=…`. */
function parseFilter({ type, categoryId, from, to }: Params): TransactionHistoryInitialFilter {
  const id = Number(categoryId);
  return {
    type: type === 'income' || type === 'expense' ? type : undefined,
    categoryId: Number.isInteger(id) && id > 0 ? id : undefined,
    range:
      from || to
        ? {
            from: from && isIsoDate(from) ? from : null,
            to: to && isIsoDate(to) ? to : null,
          }
        : undefined,
  };
}

export default function TransactionsScreen() {
  const params = useLocalSearchParams<Params>();
  return <TransactionHistoryView initialFilter={parseFilter(params)} />;
}
