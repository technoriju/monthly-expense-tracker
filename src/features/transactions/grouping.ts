import type { IsoDate } from '@/utils/dates';

import type { Transaction } from './types';

export interface TransactionDayGroup {
  date: IsoDate;
  transactions: Transaction[];
}

/** Groups an already-sorted list into consecutive same-date groups, preserving order. */
export function groupByDate(transactions: readonly Transaction[]): TransactionDayGroup[] {
  const groups: TransactionDayGroup[] = [];
  for (const tx of transactions) {
    const last = groups[groups.length - 1];
    if (last && last.date === tx.occurredOn) last.transactions.push(tx);
    else groups.push({ date: tx.occurredOn, transactions: [tx] });
  }
  return groups;
}
