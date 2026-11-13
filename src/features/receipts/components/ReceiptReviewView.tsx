import { router } from 'expo-router';
import { Camera, ScanText, TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppHeader,
  AppIcon,
  AppInput,
  AppScreen,
  AppText,
} from '@/components/ui';
import { TransactionFormFields } from '@/features/transactions/components/TransactionFormFields';
import { useReceiptDraftStore } from '@/store/receiptDraftStore';
import { makeStyles } from '@/theme';

import type { ReceiptDraft } from '../draft';
import { useReceiptReview } from '../hooks/useReceiptReview';
import { RECEIPT_NUMBER_MAX_LENGTH, RECEIPT_TEXT_MAX_LENGTH } from '../schemas';
import { receiptImageStore } from '../services/receiptImageStore';
import { ReceiptIssuesCard } from './ReceiptIssuesCard';
import { ReceiptItemsCard } from './ReceiptItemsCard';
import { ReceiptPhoto } from './ReceiptPhoto';
import { ReceiptTotalsCard } from './ReceiptTotalsCard';

/**
 * Review and confirm a scanned receipt. Everything OCR found is editable; nothing is saved
 * until "Save expense". Reads the draft once on mount so clearing it after saving does not
 * flash the empty state during navigation.
 */
export function ReceiptReviewView() {
  const [draft] = useState(() => useReceiptDraftStore.getState().draft);
  return draft ? <ReviewForm draft={draft} /> : <NoDraft />;
}

function NoDraft() {
  const { t } = useTranslation('receipts');
  return (
    <AppScreen header={<AppHeader title={t('review.title')} back />} scroll={false}>
      <AppEmptyState
        icon={ScanText}
        title={t('review.empty.title')}
        message={t('review.empty.message')}
        action={{ label: t('review.empty.action'), onPress: () => router.replace('/receipt/scan') }}
      />
    </AppScreen>
  );
}

function ReviewForm({ draft: initial }: { draft: ReceiptDraft }) {
  const styles = useStyles();
  const { t } = useTranslation('receipts');
  const review = useReceiptReview(initial);
  const { draft, form } = review;
  const saving = review.isSubmitting || form.formState.isSubmitting;
  const saveError = form.formState.errors.root?.save?.message;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppScreen
        scrollRef={review.scrollRef}
        edges={['top', 'left', 'right', 'bottom']}
        header={<AppHeader title={t('review.title')} back={review.discard} />}>
        <ReceiptPhoto uri={receiptImageStore.uriOf(draft.imageFile)} />

        {draft.flags.includes('noText') ? (
          <AppCard variant="muted" style={styles.note}>
            <AppIcon icon={TriangleAlert} size="sm" color="accentText" />
            <AppText variant="bodySmall" style={styles.flex}>
              {t('review.noText')}
            </AppText>
          </AppCard>
        ) : null}

        <AppInput
          label={t('review.vendor')}
          value={draft.vendorName}
          onChangeText={(vendorName) => review.updateDraft({ vendorName })}
          placeholder={t('review.optional')}
          maxLength={RECEIPT_TEXT_MAX_LENGTH}
        />
        <AppInput
          label={t('review.receiptNumber')}
          value={draft.receiptNumber}
          onChangeText={(receiptNumber) => review.updateDraft({ receiptNumber })}
          placeholder={t('review.optional')}
          maxLength={RECEIPT_NUMBER_MAX_LENGTH}
          autoCapitalize="characters"
        />

        <ReceiptItemsCard items={draft.items} onChange={(items) => review.updateDraft({ items })} />
        <ReceiptTotalsCard totals={draft} onChange={(totals) => review.updateDraft(totals)} />

        <ReceiptIssuesCard
          issues={review.issues}
          items={draft.items}
          totalCandidates={draft.totalCandidates}
          onChooseTotal={review.chooseTotal}
          mustConfirm={review.mustConfirm}
          confirmed={review.confirmed}
          onConfirmedChange={review.setConfirmed}
          confirmMissing={review.confirmMissing}
        />

        <TransactionFormFields
          control={form.control}
          categories={review.categories}
          categoriesLoading={review.categoriesLoading}
          categoriesError={review.categoriesError}
          onRetryCategories={review.retryCategories}
          onAddCategory={review.addCategory}
        />

        {saveError ? (
          <AppText variant="bodySmall" color="expenseText" accessibilityRole="alert">
            {saveError}
          </AppText>
        ) : null}

        <View style={styles.actions}>
          <AppButton
            label={t('review.save')}
            onPress={review.save}
            loading={saving}
            fullWidth
            testID="receipt-save"
          />
          <AppButton
            label={t('review.rescan')}
            variant="secondary"
            icon={Camera}
            onPress={review.rescan}
            disabled={saving}
            fullWidth
          />
          <AppButton
            label={t('review.cancel')}
            variant="ghost"
            onPress={review.discard}
            disabled={saving}
            fullWidth
          />
        </View>
      </AppScreen>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  note: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  actions: { gap: t.spacing.sm },
}));
