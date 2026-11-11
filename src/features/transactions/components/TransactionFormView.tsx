import { router } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import {
  AppButton,
  AppHeader,
  AppIconButton,
  AppInput,
  AppLoading,
  AppScreen,
  AppSegmentedControl,
  AppText,
} from '@/components/ui';
import { CategoryGrid } from '@/features/categories/components/CategoryGrid';
import { useSettingsStore } from '@/store/settingsStore';
import { makeStyles } from '@/theme';
import type { TransactionType } from '@/types/money';
import { toIsoDate } from '@/utils/dates';
import { getCurrencyInfo, minorToInputString } from '@/utils/money';

import { useDeleteTransaction } from '../hooks/useDeleteTransaction';
import { useTransactionForm } from '../hooks/useTransactionForm';
import { NOTE_MAX_LENGTH, type TransactionFormValues, type ValidationMessage } from '../schemas';
import type { Transaction } from '../types';
import { DateField } from './DateField';
import { PaymentMethodField } from './PaymentMethodField';

const VALIDATION_MESSAGES: readonly ValidationMessage[] = [
  'amountRequired',
  'amountInvalid',
  'categoryRequired',
  'categoryMismatch',
  'dateInvalid',
  'noteTooLong',
];

function isValidationMessage(value: unknown): value is ValidationMessage {
  return VALIDATION_MESSAGES.includes(value as ValidationMessage);
}

export type TransactionFormMode =
  { kind: 'create'; initialType: TransactionType } | { kind: 'edit'; transaction: Transaction };

/**
 * Add / Edit Transaction screen body (design-reference row 1, col 4).
 * No category is pre-selected on create: the user must choose one deliberately.
 */
export function TransactionFormView({ mode }: { mode: TransactionFormMode }) {
  const styles = useStyles();
  const { t } = useTranslation('transactions');
  const currency = useSettingsStore((s) => s.currency);
  const confirmDelete = useDeleteTransaction();

  const defaults: TransactionFormValues =
    mode.kind === 'edit'
      ? {
          type: mode.transaction.type,
          amount: minorToInputString(mode.transaction.amountMinor, mode.transaction.currency),
          categoryId: mode.transaction.categoryId,
          occurredOn: mode.transaction.occurredOn,
          note: mode.transaction.note ?? '',
          paymentMethod: mode.transaction.paymentMethod,
        }
      : {
          type: mode.initialType,
          amount: '',
          categoryId: null,
          occurredOn: toIsoDate(new Date()),
          note: '',
          paymentMethod: null,
        };

  const { form, categories, categoriesLoading, changeType, submit, isSubmitting } =
    useTransactionForm(defaults, mode.kind === 'edit' ? mode.transaction.id : undefined);
  const { control, formState } = form;
  const errorText = (message: unknown) =>
    isValidationMessage(message) ? t(`validation.${message}`) : undefined;

  const title = mode.kind === 'edit' ? t('edit.title') : t('add.title');
  const onDelete =
    mode.kind === 'edit' ? () => confirmDelete(mode.transaction, () => router.back()) : undefined;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppScreen
        edges={['top', 'left', 'right', 'bottom']}
        header={
          <AppHeader
            title={title}
            back
            right={
              onDelete ? (
                <AppIconButton
                  icon={Trash2}
                  color="expense"
                  onPress={onDelete}
                  accessibilityLabel={t('delete.label')}
                />
              ) : undefined
            }
          />
        }>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <AppSegmentedControl
              accessibilityLabel={t('type.label')}
              value={field.value}
              onChange={changeType}
              options={[
                { value: 'expense', label: t('type.expense') },
                { value: 'income', label: t('type.income') },
              ]}
            />
          )}
        />

        <Controller
          control={control}
          name="categoryId"
          render={({ field, fieldState }) => (
            <View style={styles.group}>
              <AppText variant="bodyMedium">{t('fields.category')}</AppText>
              {categoriesLoading ? (
                <AppLoading />
              ) : (
                <CategoryGrid
                  accessibilityLabel={t('fields.category')}
                  categories={categories}
                  selectedId={field.value}
                  onSelect={(category) => field.onChange(category.id)}
                />
              )}
              {fieldState.error ? (
                <AppText variant="bodySmall" color="expense" accessibilityLiveRegion="polite">
                  {errorText(fieldState.error.message)}
                </AppText>
              ) : null}
            </View>
          )}
        />

        <View style={styles.fields}>
          <Controller
            control={control}
            name="amount"
            render={({ field, fieldState }) => (
              <AppInput
                label={t('fields.amount')}
                placeholder={t('fields.amountPlaceholder')}
                prefix={
                  <AppText variant="bodyMedium" color="textSecondary">
                    {getCurrencyInfo(currency).symbol}
                  </AppText>
                }
                keyboardType="decimal-pad"
                inputMode="decimal"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errorText(fieldState.error?.message)}
                returnKeyType="done"
              />
            )}
          />

          <Controller
            control={control}
            name="occurredOn"
            render={({ field, fieldState }) => (
              <DateField
                label={t('fields.date')}
                value={field.value}
                onChange={field.onChange}
                error={errorText(fieldState.error?.message)}
              />
            )}
          />

          <Controller
            control={control}
            name="note"
            render={({ field, fieldState }) => (
              <AppInput
                label={t('fields.note')}
                placeholder={t('fields.notePlaceholder')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                maxLength={NOTE_MAX_LENGTH}
                multiline
                error={errorText(fieldState.error?.message)}
              />
            )}
          />

          <Controller
            control={control}
            name="paymentMethod"
            render={({ field }) => (
              <PaymentMethodField value={field.value} onChange={field.onChange} />
            )}
          />
        </View>

        <View style={styles.actions}>
          <AppButton
            label={t('actions.save')}
            onPress={() => void submit()}
            loading={isSubmitting || formState.isSubmitting}
            fullWidth
          />
          <AppButton
            label={t('actions.cancel')}
            variant="ghost"
            onPress={() => router.back()}
            disabled={isSubmitting}
            fullWidth
          />
        </View>
      </AppScreen>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  group: { gap: t.spacing.sm },
  fields: { gap: t.spacing.lg },
  actions: { gap: t.spacing.sm },
}));
