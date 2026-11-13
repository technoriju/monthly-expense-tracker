import { router } from 'expo-router';
import { Pencil, SearchX, Trash2, TriangleAlert } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppHeader,
  AppIconButton,
  AppInput,
  AppLoading,
  AppScreen,
  AppText,
} from '@/components/ui';
import { useFormatters } from '@/hooks/useFormatters';
import { makeStyles } from '@/theme';

import { toDraftItem, useReceiptDetail } from '../hooks/useReceiptDetail';
import { RECEIPT_NUMBER_MAX_LENGTH, RECEIPT_TEXT_MAX_LENGTH } from '../schemas';
import type { ReceiptItemDraft } from '../types';
import { ReceiptItemsCard } from './ReceiptItemsCard';
import { ReceiptPhoto } from './ReceiptPhoto';
import { ReceiptTotalsCard } from './ReceiptTotalsCard';

/** The receipt saved with an expense: photo, shop, items, totals; edit or remove it. */
export function ReceiptDetailView({ transactionId }: { transactionId: number }) {
  const styles = useStyles();
  const { t } = useTranslation('receipts');
  const format = useFormatters();
  const detail = useReceiptDetail(transactionId);
  const { state, editing } = detail;

  if (state.status !== 'ready') {
    return (
      <AppScreen
        header={<AppHeader title={t('detail.title')} back />}
        scroll={false}
        contentStyle={styles.centered}>
        {state.status === 'loading' ? (
          <AppLoading />
        ) : (
          <AppEmptyState
            icon={state.status === 'notFound' ? SearchX : TriangleAlert}
            tone={state.status === 'error' ? 'error' : 'default'}
            title={state.status === 'notFound' ? t('detail.notFound') : t('detail.loadError')}
            action={
              state.status === 'error'
                ? { label: t('detail.retry'), onPress: detail.retry }
                : { label: t('detail.cancel'), onPress: () => router.back() }
            }
          />
        )}
      </AppScreen>
    );
  }

  const { receipt, imageUri } = state.view;
  const { transaction } = state;
  const items: ReceiptItemDraft[] = editing ? editing.items : receipt.items.map(toDraftItem);
  const amountDiffers =
    receipt.extractedTotalMinor !== null && receipt.extractedTotalMinor !== transaction.amountMinor;

  return (
    <AppScreen
      edges={['top', 'left', 'right', 'bottom']}
      header={
        <AppHeader
          title={t('detail.title')}
          back
          right={
            editing ? undefined : (
              <AppIconButton
                icon={Trash2}
                color="expense"
                onPress={detail.remove}
                accessibilityLabel={t('detail.remove')}
              />
            )
          }
        />
      }>
      <ReceiptPhoto
        uri={imageUri}
        missingLabel={receipt.imageFile ? t('detail.photoMissing') : undefined}
      />

      {editing ? (
        <>
          <AppInput
            label={t('review.vendor')}
            value={editing.vendorName}
            onChangeText={(vendorName) => detail.setEditing({ ...editing, vendorName })}
            placeholder={t('review.optional')}
            maxLength={RECEIPT_TEXT_MAX_LENGTH}
          />
          <AppInput
            label={t('review.receiptNumber')}
            value={editing.receiptNumber}
            onChangeText={(receiptNumber) => detail.setEditing({ ...editing, receiptNumber })}
            placeholder={t('review.optional')}
            maxLength={RECEIPT_NUMBER_MAX_LENGTH}
          />
        </>
      ) : (
        <AppCard style={styles.summary}>
          {receipt.vendorName ? <AppText variant="heading3">{receipt.vendorName}</AppText> : null}
          <AppText variant="amountMedium" color="expenseText" constrainScale>
            {format.money(transaction.amountMinor)}
          </AppText>
          <AppText variant="bodySmall" color="textSecondary">
            {[format.longDate(transaction.occurredOn), receipt.receiptNumber]
              .filter(Boolean)
              .join(' · ')}
          </AppText>
          {amountDiffers ? (
            <AppText variant="bodySmall" color="accentText">
              {t('detail.amountDiffers', {
                amount: format.money(transaction.amountMinor),
                read: format.money(receipt.extractedTotalMinor ?? 0),
              })}
            </AppText>
          ) : null}
        </AppCard>
      )}

      {items.length === 0 && !editing ? (
        <AppText variant="bodySmall" color="textSecondary">
          {t('detail.noItems')}
        </AppText>
      ) : (
        <ReceiptItemsCard
          items={items}
          onChange={editing ? (next) => detail.setEditing({ ...editing, items: next }) : undefined}
        />
      )}

      {!editing &&
      [
        receipt.subtotalMinor,
        receipt.taxMinor,
        receipt.discountMinor,
        receipt.chargesMinor,
        receipt.roundOffMinor,
      ].some((v) => v !== null) ? (
        <ReceiptTotalsCard totals={receipt} />
      ) : null}

      {detail.saveFailed ? (
        <AppText variant="bodySmall" color="expenseText" accessibilityRole="alert">
          {t('detail.saveFailed')}
        </AppText>
      ) : null}

      <View style={styles.actions}>
        {editing ? (
          <>
            <AppButton
              label={t('detail.save')}
              onPress={() => void detail.saveEdit()}
              loading={detail.saving}
              fullWidth
            />
            <AppButton
              label={t('detail.cancel')}
              variant="ghost"
              onPress={detail.cancelEdit}
              fullWidth
            />
          </>
        ) : (
          <AppButton
            label={t('detail.edit')}
            icon={Pencil}
            variant="secondary"
            onPress={detail.startEdit}
            fullWidth
          />
        )}
      </View>
    </AppScreen>
  );
}

const useStyles = makeStyles((t) => ({
  centered: { justifyContent: 'center' },
  summary: { gap: t.spacing.xs },
  actions: { gap: t.spacing.sm },
}));
