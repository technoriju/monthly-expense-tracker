import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import type { Category } from '@/features/categories/types';
import { useSettingsStore } from '@/store/settingsStore';
import { useUiStore } from '@/store/uiStore';
import type { CurrencyCode } from '@/types/money';
import { minorToInputString } from '@/utils/money';

import { createBudgetFormSchema, toAmountMinor, type BudgetFormValues } from '../schemas';
import { BudgetError, budgetService } from '../services/budgetService';
import type { Budget } from '../types';

/** What the editor sheet is opened for. */
export type BudgetEditorTarget =
  | { mode: 'create'; budgetType: 'overall' }
  | { mode: 'create'; budgetType: 'category'; categoryId: number | null }
  | { mode: 'edit'; budget: Budget; category: Category | null };

function defaultsFor(target: BudgetEditorTarget, currency: CurrencyCode): BudgetFormValues {
  if (target.mode === 'edit') {
    return {
      budgetType: target.budget.budgetType,
      amount: minorToInputString(target.budget.amountMinor, currency),
      categoryId: target.budget.categoryId,
    };
  }
  return {
    budgetType: target.budgetType,
    amount: '',
    categoryId: target.budgetType === 'category' ? target.categoryId : null,
  };
}

/**
 * Budget editor form: React Hook Form + Zod, duplicate-submit guard, persistence and
 * feedback. Creates for `month` or updates the amount of an existing budget.
 */
export function useBudgetEditor(target: BudgetEditorTarget, month: Date, onSaved: () => void) {
  const { t } = useTranslation('budgets');
  const currency = useSettingsStore((s) => s.currency);
  const showToast = useUiStore((s) => s.showToast);
  const schema = useMemo(() => createBudgetFormSchema(currency), [currency]);
  const submitting = useRef(false);

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultsFor(target, currency),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const onValid = async (values: BudgetFormValues) => {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const amountMinor = toAmountMinor(values.amount, currency);
      if (target.mode === 'edit') {
        await budgetService.updateAmount(target.budget.id, amountMinor);
      } else {
        await budgetService.create({
          budgetType: values.budgetType,
          categoryId: values.categoryId,
          month,
          amountMinor,
        });
      }
      showToast(t('toast.saved'));
      onSaved();
    } catch (error) {
      if (error instanceof BudgetError) {
        const field =
          error.code === 'duplicate' || error.code === 'notFound' ? 'root' : 'categoryId';
        form.setError(field, { message: `errors.${error.code}` });
      } else {
        console.error('Saving budget failed', error);
        showToast(t('errors.saveFailed'), 'error');
      }
    } finally {
      submitting.current = false;
    }
  };

  /** Validates, then saves. Repeated taps while a save is in flight are ignored. */
  const submit = () => form.handleSubmit(onValid)();

  return { form, submit };
}
