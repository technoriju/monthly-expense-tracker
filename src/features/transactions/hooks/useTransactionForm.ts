import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useMemo, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { useCategories } from '@/features/categories/hooks/useCategories';
import { useSettingsStore } from '@/store/settingsStore';
import { useUiStore } from '@/store/uiStore';

import {
  createTransactionFormSchema,
  toTransactionInput,
  type TransactionFormValues,
} from '../schemas';
import { TransactionError, transactionService } from '../services/transactionService';

/**
 * Add/Edit form state: React Hook Form + Zod, category list for the selected type,
 * duplicate-submit guard, persistence and feedback. Pass `transactionId` to edit.
 */
export function useTransactionForm(defaults: TransactionFormValues, transactionId?: number) {
  const { t } = useTranslation('transactions');
  const currency = useSettingsStore((s) => s.currency);
  const showToast = useUiStore((s) => s.showToast);
  const schema = useMemo(() => createTransactionFormSchema(currency), [currency]);
  const submitting = useRef(false);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const type = useWatch({ control: form.control, name: 'type' });
  const { categories, loading: categoriesLoading } = useCategories(type);

  /** Switching Expense ↔ Income clears the category: it belongs to the other type. */
  const changeType = (next: TransactionFormValues['type']) => {
    if (next === form.getValues('type')) return;
    form.setValue('type', next);
    form.setValue('categoryId', null);
    form.clearErrors('categoryId');
  };

  const onValid = async (values: TransactionFormValues) => {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const input = toTransactionInput(values, currency);
      if (transactionId === undefined) {
        await transactionService.create(input);
        showToast(t('toast.created'));
      } else {
        await transactionService.update(transactionId, input);
        showToast(t('toast.updated'));
      }
      router.back();
    } catch (error) {
      if (error instanceof TransactionError && error.code === 'categoryMismatch') {
        form.setError('categoryId', { message: 'categoryMismatch' });
      } else if (error instanceof TransactionError && error.code === 'notFound') {
        showToast(t('notFound.title'), 'error');
        router.back();
      } else {
        console.error('Saving transaction failed', error);
        showToast(t('toast.saveFailed'), 'error');
      }
    } finally {
      submitting.current = false;
    }
  };

  /** Validates, then saves. Repeated taps while a save is in flight are ignored. */
  const submit = () => form.handleSubmit(onValid)();

  return {
    form,
    categories,
    categoriesLoading,
    changeType,
    submit,
    isSubmitting: form.formState.isSubmitting,
  };
}
