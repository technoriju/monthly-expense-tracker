import { useEffect, useState } from 'react';

import { transactionService } from '../services/transactionService';
import type { Transaction } from '../types';

export type TransactionLoadState =
  | { status: 'loading' }
  | { status: 'notFound' }
  | { status: 'error' }
  | { status: 'ready'; transaction: Transaction };

type Result = Exclude<TransactionLoadState, { status: 'loading' }>;

/** Loads one transaction for editing. Invalid ids resolve to `notFound`. */
export function useTransaction(id: number): TransactionLoadState {
  const valid = Number.isInteger(id) && id > 0;
  const [loaded, setLoaded] = useState<{ id: number; result: Result } | null>(null);

  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    transactionService
      .getById(id)
      .then((transaction) => {
        if (cancelled) return;
        setLoaded({
          id,
          result: transaction ? { status: 'ready', transaction } : { status: 'notFound' },
        });
      })
      .catch((error: unknown) => {
        console.error('Loading transaction failed', error);
        if (!cancelled) setLoaded({ id, result: { status: 'error' } });
      });
    return () => {
      cancelled = true;
    };
  }, [id, valid]);

  if (!valid) return { status: 'notFound' };
  return loaded?.id === id ? loaded.result : { status: 'loading' };
}
