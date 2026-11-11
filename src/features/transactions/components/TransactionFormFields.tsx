import { Controller, type Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppInput, AppLoading, AppText } from '@/components/ui';
import { CategoryGrid } from '@/features/categories/components/CategoryGrid';
import type { Category } from '@/features/categories/types';
import { useSettingsStore } from '@/store/settingsStore';
import { makeStyles } from '@/theme';
import { getCurrencyInfo } from '@/utils/money';

import { NOTE_MAX_LENGTH, type TransactionFormValues, type ValidationMessage } from '../schemas';
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

/** Already-translated notes shown under a field while it has no validation error. */
export type TransactionFieldHints = Partial<Record<'category' | 'amount' | 'date', string>>;

export interface TransactionFormFieldsProps {
  control: Control<TransactionFormValues>;
  categories: Category[];
  categoriesLoading: boolean;
  hints?: TransactionFieldHints;
}

/**
 * Category grid, amount, date, note and payment method bound to a transaction form.
 * Shared by Add/Edit Transaction and the voice Review screen.
 */
export function TransactionFormFields({
  control,
  categories,
  categoriesLoading,
  hints = {},
}: TransactionFormFieldsProps) {
  const styles = useStyles();
  const { t } = useTranslation('transactions');
  const currency = useSettingsStore((s) => s.currency);
  const errorText = (message: unknown) =>
    isValidationMessage(message) ? t(`validation.${message}`) : undefined;

  return (
    <>
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
            ) : hints.category ? (
              <AppText variant="bodySmall" color="accent">
                {hints.category}
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
              helperText={hints.amount}
              returnKeyType="done"
            />
          )}
        />

        <Controller
          control={control}
          name="occurredOn"
          render={({ field, fieldState }) => (
            <View style={styles.group}>
              <DateField
                label={t('fields.date')}
                value={field.value}
                onChange={field.onChange}
                error={errorText(fieldState.error?.message)}
              />
              {!fieldState.error && hints.date ? (
                <AppText variant="bodySmall" color="accent">
                  {hints.date}
                </AppText>
              ) : null}
            </View>
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
    </>
  );
}

const useStyles = makeStyles((t) => ({
  group: { gap: t.spacing.sm },
  fields: { gap: t.spacing.lg },
}));
