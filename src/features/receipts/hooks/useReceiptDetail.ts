import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { transactionService } from '@/features/transactions/services/transactionService';
import type { Transaction } from '@/features/transactions/types';
import { useUiStore } from '@/store/uiStore';

import { receiptService, type ReceiptView } from '../services/receiptService';
import type { ReceiptItemDraft, ReceiptItem } from '../types';

export type ReceiptDetailState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'notFound' }
  | { status: 'ready'; view: ReceiptView; transaction: Transaction };

export interface ReceiptEditValues {
  vendorName: string;
  receiptNumber: string;
  items: ReceiptItemDraft[];
}

export const toDraftItem = (item: ReceiptItem): ReceiptItemDraft => ({
  key: `saved-${item.id}`,
  name: item.itemName,
  originalOcrName: item.originalOcrName,
  quantityMilli: item.quantityMilli,
  unit: item.unit,
  unitPriceMinor: item.unitPriceMinor,
  lineTotalMinor: item.lineTotalMinor,
  nameConfidence: item.nameConfidence,
  amountConfidence: item.amountConfidence,
  flags: item.flags,
  userCorrected: item.userCorrected,
});

/** Receipt attached to an expense: view, edit details, remove the attachment. */
export function useReceiptDetail(transactionId: number) {
  const { t } = useTranslation('receipts');
  const dataVersion = useUiStore((s) => s.dataVersion);
  const showToast = useUiStore((s) => s.showToast);
  const [state, setState] = useState<ReceiptDetailState>({ status: 'loading' });
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<ReceiptEditValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [view, transaction] = await Promise.all([
          receiptService.getForTransaction(transactionId),
          transactionService.getById(transactionId),
        ]);
        if (cancelled) return;
        setState(
          view && transaction ? { status: 'ready', view, transaction } : { status: 'notFound' },
        );
      } catch (error) {
        console.error('Loading receipt failed', error);
        if (!cancelled) setState({ status: 'error' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [transactionId, dataVersion, reload]);

  const startEdit = () => {
    if (state.status !== 'ready') return;
    const { receipt } = state.view;
    setSaveFailed(false);
    setEditing({
      vendorName: receipt.vendorName ?? '',
      receiptNumber: receipt.receiptNumber ?? '',
      items: receipt.items.map(toDraftItem),
    });
  };

  const saveEdit = async () => {
    if (state.status !== 'ready' || !editing || saving) return;
    setSaving(true);
    setSaveFailed(false);
    try {
      await receiptService.updateDetails(state.view.receipt.id, {
        vendorName: editing.vendorName.trim() || null,
        receiptNumber: editing.receiptNumber.trim() || null,
        receiptDate: state.view.receipt.receiptDate,
        items: editing.items.map((item) => ({
          itemName: item.name?.trim() || null,
          originalOcrName: item.originalOcrName,
          quantityMilli: item.quantityMilli,
          unit: item.unit?.trim() || null,
          unitPriceMinor: item.unitPriceMinor,
          lineTotalMinor: item.lineTotalMinor,
          nameConfidence: item.nameConfidence,
          amountConfidence: item.amountConfidence,
          flags: item.flags,
          userCorrected: item.userCorrected,
        })),
      });
      setEditing(null);
      showToast(t('detail.updated'));
    } catch (error) {
      console.error('Updating receipt failed', error);
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    Alert.alert(t('detail.removeTitle'), t('detail.removeMessage'), [
      { text: t('detail.cancel'), style: 'cancel' },
      {
        text: t('detail.removeConfirm'),
        style: 'destructive',
        onPress: () => {
          receiptService
            .removeAttachment(transactionId)
            .then(() => {
              showToast(t('detail.removed'));
              router.back();
            })
            .catch((error: unknown) => {
              console.error('Removing receipt failed', error);
              showToast(t('detail.saveFailed'), 'error');
            });
        },
      },
    ]);
  };

  return {
    state,
    retry: () => setReload((n) => n + 1),
    editing,
    setEditing,
    startEdit,
    cancelEdit: () => setEditing(null),
    saveEdit,
    saving,
    saveFailed,
    remove,
  };
}
