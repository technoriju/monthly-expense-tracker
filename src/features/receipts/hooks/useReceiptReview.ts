import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { useTransactionForm } from '@/features/transactions/hooks/useTransactionForm';
import type { TransactionInput } from '@/features/transactions/types';
import { useReceiptDraftStore } from '@/store/receiptDraftStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useUiStore } from '@/store/uiStore';
import { minorToInputString, parseAmountToMinor } from '@/utils/money';

import type { ReceiptDraft } from '../draft';
import { startReceiptDraftPersistence } from '../services/receiptDraftPersistence';
import { receiptImageStore } from '../services/receiptImageStore';
import { ReceiptError, receiptService } from '../services/receiptService';
import type { ReceiptItemDraft } from '../types';
import {
  hasBlockingIssue,
  needsConfirmation,
  validateReceipt,
} from '../validation/receiptValidation';

/** Resolves true when the user picks the confirming button. */
function ask(title: string, message: string, confirm: string, cancel: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancel, style: 'cancel', onPress: () => resolve(false) },
        { text: confirm, onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

const toRecordItem = (item: ReceiptItemDraft) => ({
  itemName: item.name?.trim() ? item.name.trim() : null,
  originalOcrName: item.originalOcrName,
  quantityMilli: item.quantityMilli,
  unit: item.unit?.trim() ? item.unit.trim() : null,
  unitPriceMinor: item.unitPriceMinor,
  lineTotalMinor: item.lineTotalMinor,
  nameConfidence: item.nameConfidence,
  amountConfidence: item.amountConfidence,
  flags: item.flags,
  userCorrected: item.userCorrected,
});

/**
 * Review form for a receipt draft. The expense fields reuse the Add Transaction form; receipt
 * details (shop, items, totals) live in the draft store. Saving happens only from `save`,
 * after the user ticks "I've checked" for any discrepancy. A failed save keeps every edit.
 */
export function useReceiptReview(draft: ReceiptDraft) {
  const { t } = useTranslation('receipts');
  const currency = useSettingsStore((s) => s.currency);
  const showToast = useUiStore((s) => s.showToast);
  const updateDraft = useReceiptDraftStore((s) => s.updateDraft);
  const clearDraft = useReceiptDraftStore((s) => s.clearDraft);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmMissing, setConfirmMissing] = useState(false);

  useEffect(() => startReceiptDraftPersistence(), []);

  const createWith = async (input: TransactionInput) => {
    const current = useReceiptDraftStore.getState().draft ?? draft;
    const similar = await receiptService.findSimilar(input.occurredOn, input.amountMinor);
    if (
      similar !== null &&
      !(await ask(
        t('review.duplicateTitle'),
        t('review.duplicateMessage'),
        t('review.saveAnyway'),
        t('review.keepEditing'),
      ))
    ) {
      return;
    }
    const save = (imageFile: string | null) =>
      receiptService.save({
        saveKey: current.id,
        transaction: input,
        details: {
          vendorName: current.vendorName.trim() || null,
          receiptNumber: current.receiptNumber.trim() || null,
          receiptDate: input.occurredOn,
          items: current.items.map(toRecordItem),
        },
        extras: {
          originalOcrText: current.originalOcrText,
          ocrProvider: current.ocrProvider,
          extractedTotalMinor: current.extractedTotalMinor,
          subtotalMinor: current.subtotalMinor,
          taxMinor: current.taxMinor,
          discountMinor: current.discountMinor,
          chargesMinor: current.chargesMinor,
          roundOffMinor: current.roundOffMinor,
        },
        imageFile,
      });
    try {
      await save(current.imageFile);
    } catch (error) {
      if (!(error instanceof ReceiptError && error.code === 'imageMissing')) throw error;
      const withoutPhoto = await ask(
        t('review.imageMissingTitle'),
        t('review.imageMissingMessage'),
        t('review.saveWithoutPhoto'),
        t('review.keepEditing'),
      );
      if (!withoutPhoto) return;
      updateDraft({ imageFile: null });
      await save(null);
    }
    clearDraft();
    showToast(t('review.saved'));
    router.dismissTo('/');
  };

  const form = useTransactionForm(draft.form, undefined, { createWith });
  const { form: rhf } = form;

  // Mirror the expense fields into the draft so they survive the app closing.
  useEffect(() => {
    const subscription = rhf.watch((values) => {
      updateDraft({ form: { ...draft.form, ...values } as ReceiptDraft['form'] });
    });
    return () => subscription.unsubscribe();
  }, [rhf, updateDraft, draft.form]);

  const amountText = useWatch({ control: rhf.control, name: 'amount' });
  const finalAmountMinor = parseAmountToMinor(amountText, currency);
  const current = useReceiptDraftStore((s) => s.draft) ?? draft;
  const issues = validateReceipt({ ...current, finalAmountMinor });
  const mustConfirm = needsConfirmation(issues);

  const save = () => {
    if (mustConfirm && !confirmed && !hasBlockingIssue(issues)) {
      setConfirmMissing(true);
      return;
    }
    setConfirmMissing(false);
    void form.submit();
  };

  /** Fills the amount from a chosen total and resolves the "several totals" question. */
  const chooseTotal = (amountMinor: number) => {
    rhf.setValue('amount', minorToInputString(amountMinor, currency), { shouldValidate: true });
    updateDraft({
      flags: current.flags.filter((f) => f !== 'totalAmbiguous' && f !== 'totalMissing'),
    });
  };

  const leave = () => {
    clearDraft();
    router.back();
  };

  /** Asks before dropping the draft; nothing has been saved. */
  const discard = () => {
    Alert.alert(t('review.discardTitle'), t('review.discardMessage'), [
      { text: t('review.keepEditing'), style: 'cancel' },
      {
        text: t('review.discard'),
        style: 'destructive',
        onPress: () => {
          receiptImageStore.delete(current.imageFile);
          leave();
        },
      },
    ]);
  };

  /** New scan. Edits are never replaced silently. */
  const rescan = () => {
    const go = () => {
      clearDraft();
      router.replace('/receipt/scan');
    };
    if (!current.edited) {
      go();
      return;
    }
    Alert.alert(t('review.rescanTitle'), t('review.rescanMessage'), [
      { text: t('review.keepEditing'), style: 'cancel' },
      { text: t('review.rescanConfirm'), style: 'destructive', onPress: go },
    ]);
  };

  return {
    ...form,
    draft: current,
    issues,
    mustConfirm,
    confirmed,
    setConfirmed: (value: boolean) => {
      setConfirmed(value);
      if (value) setConfirmMissing(false);
    },
    confirmMissing,
    save,
    chooseTotal,
    updateDraft,
    discard,
    rescan,
  };
}
