import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { useTransactionForm } from '@/features/transactions/hooks/useTransactionForm';
import type { TransactionFormValues } from '@/features/transactions/schemas';
import { useSettingsStore } from '@/store/settingsStore';
import { useUiStore } from '@/store/uiStore';
import { useVoiceDraftStore } from '@/store/voiceDraftStore';
import { minorToInputString } from '@/utils/money';

import type { VoiceExpenseDraft } from '../types';

/**
 * Review form for a voice draft. Reuses the Add Transaction form logic (validation, submit
 * guard, error feedback) and `transactionService.create`; saving happens only from
 * `submit`, which the user triggers with "Confirm & Save". On failure the form and the
 * draft stay intact so the user can retry.
 */
export function useVoiceReview(draft: VoiceExpenseDraft) {
  const { t } = useTranslation('voice');
  const currency = useSettingsStore((s) => s.currency);
  const showToast = useUiStore((s) => s.showToast);
  const clearDraft = useVoiceDraftStore((s) => s.clearDraft);

  const defaults: TransactionFormValues = {
    type: 'expense',
    amount: draft.amountMinor === null ? '' : minorToInputString(draft.amountMinor, currency),
    categoryId: null, // resolved from the parsed key once categories load (below)
    occurredOn: draft.occurredOn,
    note: draft.note,
    paymentMethod: draft.paymentMethod,
  };

  const form = useTransactionForm(defaults, undefined, {
    source: 'voice',
    voiceTranscript: draft.recognizedText,
    onCreated: () => {
      clearDraft();
      showToast(t('toast.saved'));
      router.dismissTo('/');
    },
  });

  const { categories, form: rhf } = form;
  const categoryResolved = useRef(false);
  useEffect(() => {
    if (categoryResolved.current || draft.categoryKey === null) return;
    const match = categories.find((c) => c.key === draft.categoryKey);
    if (!match) return;
    categoryResolved.current = true;
    if (rhf.getValues('categoryId') === null) rhf.setValue('categoryId', match.id);
  }, [categories, draft.categoryKey, rhf]);

  /** Back to the voice screen for a new recording; this draft is dropped. */
  const recordAgain = () => {
    clearDraft();
    router.back();
  };

  /** Asks before throwing the draft away. Nothing is written either way. */
  const discard = () => {
    Alert.alert(t('review.discardTitle'), t('review.discardMessage'), [
      { text: t('review.keepEditing'), style: 'cancel' },
      {
        text: t('review.discard'),
        style: 'destructive',
        onPress: () => {
          clearDraft();
          router.back();
        },
      },
    ]);
  };

  return { ...form, recordAgain, discard };
}
