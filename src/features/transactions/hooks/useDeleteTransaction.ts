import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { useCategoryName } from '@/features/categories/hooks/useCategoryName';
import { useFormatters } from '@/hooks/useFormatters';
import { useUiStore } from '@/store/uiStore';

import { TransactionError, transactionService } from '../services/transactionService';
import type { Transaction } from '../types';

/**
 * Returns `confirmDelete(tx, onDeleted?)`: shows a confirmation naming the transaction and
 * deletes only after the user explicitly confirms.
 */
export function useDeleteTransaction() {
  const { t } = useTranslation('transactions');
  const nameOf = useCategoryName();
  const format = useFormatters();
  const showToast = useUiStore((s) => s.showToast);

  return (transaction: Transaction, onDeleted?: () => void) => {
    const message = t('delete.message', {
      category: nameOf(transaction.category),
      amount: format.money(transaction.amountMinor),
      date: format.longDate(transaction.occurredOn),
    });
    Alert.alert(t('delete.title'), message, [
      { text: t('actions.cancel'), style: 'cancel' },
      {
        text: t('actions.delete'),
        style: 'destructive',
        onPress: () => {
          transactionService
            .remove(transaction.id)
            .then(() => {
              showToast(t('toast.deleted'));
              onDeleted?.();
            })
            .catch((error: unknown) => {
              if (error instanceof TransactionError && error.code === 'notFound') {
                // Already gone — the end state the user asked for.
                showToast(t('toast.deleted'));
                onDeleted?.();
                return;
              }
              console.error('Deleting transaction failed', error);
              showToast(t('toast.deleteFailed'), 'error');
            });
        },
      },
    ]);
  };
}
