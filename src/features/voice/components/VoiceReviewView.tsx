import { router } from 'expo-router';
import { Mic, MicOff } from 'lucide-react-native';
import { useState } from 'react';
import { useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppHeader,
  AppIcon,
  AppScreen,
  AppText,
} from '@/components/ui';
import {
  TransactionFormFields,
  type TransactionFieldHints,
} from '@/features/transactions/components/TransactionFormFields';
import { getLanguage } from '@/i18n/languages';
import { useVoiceDraftStore } from '@/store/voiceDraftStore';
import { makeStyles } from '@/theme';

import { useVoiceReview } from '../hooks/useVoiceReview';
import type { VoiceExpenseDraft } from '../types';

/**
 * Review & confirm a voice expense. Reads the draft once on mount, so clearing it after a
 * successful save does not flash the empty state during navigation.
 */
export function VoiceReviewView() {
  const [draft] = useState(() => useVoiceDraftStore.getState().draft);
  return draft ? <VoiceReviewForm draft={draft} /> : <NoDraft />;
}

function NoDraft() {
  const { t } = useTranslation('voice');
  return (
    <AppScreen header={<AppHeader title={t('review.title')} back />} scroll={false}>
      <AppEmptyState
        icon={MicOff}
        title={t('review.empty.title')}
        message={t('review.empty.message')}
        action={{ label: t('review.recordAgain'), onPress: () => router.back() }}
      />
    </AppScreen>
  );
}

function VoiceReviewForm({ draft }: { draft: VoiceExpenseDraft }) {
  const styles = useStyles();
  const { t } = useTranslation('voice');
  const {
    form,
    categories,
    categoriesLoading,
    categoriesError,
    retryCategories,
    submit,
    scrollRef,
    isSubmitting,
    recordAgain,
    discard,
  } = useVoiceReview(draft);
  const [amount, categoryId] = useWatch({ control: form.control, name: ['amount', 'categoryId'] });

  const uncertain = new Set(draft.uncertainFields);
  const hints: TransactionFieldHints = {
    amount:
      amount.trim() === ''
        ? uncertain.has('amount')
          ? t('review.uncertain.amount')
          : t('review.missing.amount')
        : undefined,
    category:
      categoryId === null
        ? uncertain.has('category')
          ? t('review.uncertain.category')
          : t('review.missing.category')
        : undefined,
    date: uncertain.has('date') ? t('review.uncertain.date') : undefined,
  };
  const saving = isSubmitting || form.formState.isSubmitting;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppScreen
        scrollRef={scrollRef}
        edges={['top', 'left', 'right', 'bottom']}
        header={<AppHeader title={t('review.title')} back />}>
        <AppCard variant="muted" style={styles.heard}>
          <View style={styles.heardLabel}>
            <AppIcon icon={Mic} size="sm" color="primary" />
            <AppText variant="caption" color="primaryText">
              {t('review.heard')}
            </AppText>
          </View>
          <AppText variant="bodyMedium" script={getLanguage(draft.language).script}>
            {draft.recognizedText}
          </AppText>
        </AppCard>

        <TransactionFormFields
          control={form.control}
          categories={categories}
          categoriesLoading={categoriesLoading}
          categoriesError={categoriesError}
          onRetryCategories={retryCategories}
          hints={hints}
        />

        <View style={styles.actions}>
          <AppButton
            label={t('review.confirm')}
            onPress={() => void submit()}
            loading={saving}
            fullWidth
            testID="voice-confirm"
          />
          <AppButton
            label={t('review.recordAgain')}
            variant="secondary"
            icon={Mic}
            onPress={recordAgain}
            disabled={saving}
            fullWidth
          />
          <AppButton
            label={t('review.cancel')}
            variant="ghost"
            onPress={discard}
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
  heard: { gap: t.spacing.xs },
  heardLabel: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs },
  actions: { gap: t.spacing.sm },
}));
