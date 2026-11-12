import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { useCategoryName } from '@/features/categories/hooks/useCategoryName';
import type { Category } from '@/features/categories/types';
import { useFormatters } from '@/hooks/useFormatters';
import { useUiStore } from '@/store/uiStore';

import { BudgetError, budgetService } from '../services/budgetService';
import type { Budget } from '../types';

/**
 * Returns `confirmDelete(budget, category, month, onDeleted?)`: asks for confirmation naming
 * the budget, and deletes only after the user confirms. Transactions are never touched.
 */
export function useDeleteBudget() {
  const { t } = useTranslation('budgets');
  const nameOf = useCategoryName();
  const format = useFormatters();
  const showToast = useUiStore((s) => s.showToast);

  return (budget: Budget, category: Category | null, month: Date, onDeleted?: () => void) => {
    const params = { amount: format.money(budget.amountMinor), month: format.monthYear(month) };
    const message =
      budget.budgetType === 'category' && category
        ? t('delete.messageCategory', { ...params, category: nameOf(category) })
        : t('delete.messageOverall', params);
    const done = () => {
      showToast(t('toast.deleted'));
      onDeleted?.();
    };
    Alert.alert(t('delete.title'), message, [
      { text: t('delete.cancel'), style: 'cancel' },
      {
        text: t('delete.confirm'),
        style: 'destructive',
        onPress: () => {
          budgetService
            .remove(budget.id)
            .then(done)
            .catch((error: unknown) => {
              // Already gone — the end state the user asked for.
              if (error instanceof BudgetError && error.code === 'notFound') return done();
              console.error('Deleting budget failed', error);
              showToast(t('toast.deleteFailed'), 'error');
            });
        },
      },
    ]);
  };
}
