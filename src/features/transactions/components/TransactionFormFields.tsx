import { Controller, useFormState, type Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppButton, AppInput, AppLoading, AppText } from '@/components/ui';
import { CategoryGrid } from '@/features/categories/components/CategoryGrid';
import type { Category } from '@/features/categories/types';
import { useAnnounce } from '@/hooks/useAnnounce';
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
  /** Categories failed to load: shows a message and a retry button instead of the grid. */
  categoriesError?: boolean;
  onRetryCategories?: () => void;
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
  categoriesError = false,
  onRetryCategories,
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
            ) : categoriesError ? (
              <View style={styles.inlineError}>
                <AppText variant="bodySmall" color="expenseText" accessibilityRole="alert">
                  {t('formErrors.categoriesFailed')}
                </AppText>
                {onRetryCategories ? (
                  <AppButton
                    label={t('formErrors.retry')}
                    variant="secondary"
                    size="sm"
                    onPress={onRetryCategories}
                  />
                ) : null}
              </View>
            ) : (
              <CategoryGrid
                accessibilityLabel={t('fields.category')}
                categories={categories}
                selectedId={field.value}
                onSelect={(category) => field.onChange(category.id)}
              />
            )}
            {fieldState.error ? (
              <AppText variant="bodySmall" color="expenseText" accessibilityLiveRegion="polite">
                {errorText(fieldState.error.message)}
              </AppText>
            ) : hints.category ? (
              <AppText variant="bodySmall" color="accentText">
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
                <AppText variant="bodySmall" color="accentText">
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
      <SaveError control={control} />
    </>
  );
}

/** The last save failure (set by the form hook as `root.save`), shown above the buttons. */
function SaveError({ control }: { control: Control<TransactionFormValues> }) {
  const { errors } = useFormState({ control });
  const message = errors.root?.save?.message;
  useAnnounce(message);

  if (!message) return null;
  return (
    <AppText
      variant="bodySmall"
      color="expenseText"
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive">
      {message}
    </AppText>
  );
}

const useStyles = makeStyles((t) => ({
  group: { gap: t.spacing.sm },
  fields: { gap: t.spacing.lg },
  inlineError: { gap: t.spacing.sm, alignItems: 'flex-start' },
}));
