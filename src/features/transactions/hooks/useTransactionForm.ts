import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useMemo, useRef } from 'react';
import { useForm, useWatch, type FieldErrors } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Keyboard, type ScrollViewInstance } from 'react-native';

import { useCategoriesByUsage } from '@/features/categories/hooks/useCategoriesByUsage';
import { useSettingsStore } from '@/store/settingsStore';
import { useUiStore } from '@/store/uiStore';

import {
  createTransactionFormSchema,
  toTransactionInput,
  type TransactionFormValues,
} from '../schemas';
import {
  TransactionError,
  transactionService,
  type CreateOptions,
} from '../services/transactionService';

export interface TransactionFormOptions extends CreateOptions {
  /** Called after a successful create instead of the default toast + `router.back()`. */
  onCreated?: () => void;
}

/**
 * Add/Edit form state: React Hook Form + Zod, usage-ordered category list for the selected type,
 * duplicate-submit guard, persistence and feedback. Pass `transactionId` to edit.
 */
export function useTransactionForm(
  defaults: TransactionFormValues,
  transactionId?: number,
  options: TransactionFormOptions = {},
) {
  const { t } = useTranslation('transactions');
  const currency = useSettingsStore((s) => s.currency);
  const showToast = useUiStore((s) => s.showToast);
  const schema = useMemo(() => createTransactionFormSchema(currency), [currency]);
  const submitting = useRef(false);
  /** Attach to the screen's ScrollView so a failed submit can reveal the category error. */
  const scrollRef = useRef<ScrollViewInstance>(null);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const type = useWatch({ control: form.control, name: 'type' });
  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
    retry: retryCategories,
    addCategory,
  } = useCategoriesByUsage(type);

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
        const { onCreated, ...createOptions } = options;
        await transactionService.create(input, createOptions);
        if (onCreated) {
          onCreated();
          return;
        }
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
        // Shown inline (the form may be a modal, above the toast). Input stays as typed.
        form.setError('root.save', { message: t('toast.saveFailed') });
      }
    } finally {
      submitting.current = false;
    }
  };

  /**
   * The category grid sits at the top of the form, so its error is usually off-screen
   * (keyboard open, user at the Save button). Close the keyboard and scroll up to it.
   */
  const onInvalid = (errors: FieldErrors<TransactionFormValues>) => {
    Keyboard.dismiss();
    if (errors.categoryId) scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  /** Validates, then saves. Repeated taps while a save is in flight are ignored. */
  const submit = () => form.handleSubmit(onValid, onInvalid)();

  return {
    form,
    categories,
    categoriesLoading,
    categoriesError,
    retryCategories,
    addCategory,
    changeType,
    submit,
    scrollRef,
    isSubmitting: form.formState.isSubmitting,
  };
}
