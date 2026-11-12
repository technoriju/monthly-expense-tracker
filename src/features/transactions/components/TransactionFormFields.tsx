import { CircleAlert } from 'lucide-react-native';
import { Controller, useFormState, useWatch, type Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppButton, AppIcon, AppInput, AppLoading, AppText } from '@/components/ui';
import { CategoryQuickPicker } from '@/features/categories/components/CategoryQuickPicker';
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
  /** Creates a custom category of the current type (Add category tile). */
  onAddCategory: (name: string) => Promise<Category>;
  hints?: TransactionFieldHints;
}

/**
 * Category quick picker, amount, date, note and payment method bound to a transaction form.
 * Shared by Add/Edit Transaction and the voice Review screen.
 */
export function TransactionFormFields({
  control,
  categories,
  categoriesLoading,
  categoriesError = false,
  onRetryCategories,
  onAddCategory,
  hints = {},
}: TransactionFormFieldsProps) {
  const styles = useStyles();
  const type = useWatch({ control, name: 'type' });
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
              <View style={fieldState.error ? styles.gridErrored : null}>
                <CategoryQuickPicker
                  accessibilityLabel={t('fields.category')}
                  type={type}
                  categories={categories}
                  selectedId={field.value}
                  onSelect={field.onChange}
                  onAddCategory={onAddCategory}
                />
              </View>
            )}
            {fieldState.error ? (
              <FieldErrorBanner message={errorText(fieldState.error.message)} />
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

/**
 * Danger-style banner (design.md: light red background, red text) for the category error.
 * Plain red text under the large grid was easy to miss.
 */
function FieldErrorBanner({ message }: { message: string | undefined }) {
  const styles = useStyles();
  useAnnounce(message);

  if (!message) return null;
  return (
    <View
      style={styles.errorBanner}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive">
      <AppIcon icon={CircleAlert} size="sm" color="expense" />
      <AppText variant="bodyMedium" color="expenseText" style={styles.errorBannerText}>
        {message}
      </AppText>
    </View>
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
  gridErrored: {
    borderRadius: t.radius.lg,
    borderWidth: t.layout.borderWidth,
    borderColor: t.colors.expense,
    padding: t.spacing.xs,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.expenseSoft,
  },
  errorBannerText: { flex: 1 },
}));
