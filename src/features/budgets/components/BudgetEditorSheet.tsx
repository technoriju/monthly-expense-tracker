import { Controller, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppButton, AppInput, AppSheet, AppText } from '@/components/ui';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon';
import { CategoryQuickPicker } from '@/features/categories/components/CategoryQuickPicker';
import { useCategoryName } from '@/features/categories/hooks/useCategoryName';
import type { Category } from '@/features/categories/types';
import { useAnnounce } from '@/hooks/useAnnounce';
import { useFormatters } from '@/hooks/useFormatters';
import { useSettingsStore } from '@/store/settingsStore';
import { makeStyles } from '@/theme';
import { getCurrencyInfo } from '@/utils/money';

import { useBudgetEditor, type BudgetEditorTarget } from '../hooks/useBudgetEditor';
import type { BudgetValidationMessage } from '../schemas';
import type { BudgetErrorCode } from '../services/budgetService';

const VALIDATION_MESSAGES: readonly BudgetValidationMessage[] = [
  'amountRequired',
  'amountInvalid',
  'categoryRequired',
];
const ERROR_CODES: readonly BudgetErrorCode[] = [
  'duplicate',
  'notFound',
  'categoryNotFound',
  'categoryNotExpense',
];

export interface BudgetEditorSheetProps {
  target: BudgetEditorTarget | null;
  month: Date;
  /** Expense categories that can still get a budget this month (create mode). */
  availableCategories: readonly Category[];
  onClose: () => void;
  /** Delete button (edit mode only); the caller confirms before deleting. */
  onDelete: (target: Extract<BudgetEditorTarget, { mode: 'edit' }>) => void;
}

function targetKey(target: BudgetEditorTarget): string {
  return target.mode === 'edit'
    ? `edit-${target.budget.id}`
    : `create-${target.budgetType}-${target.budgetType === 'category' ? target.categoryId : ''}`;
}

/** Create/edit sheet for an overall or category budget of one month. */
export function BudgetEditorSheet(props: BudgetEditorSheetProps) {
  if (!props.target) return null;
  return <EditorSheet key={targetKey(props.target)} {...props} target={props.target} />;
}

function EditorSheet({
  target,
  month,
  availableCategories,
  onClose,
  onDelete,
}: BudgetEditorSheetProps & { target: BudgetEditorTarget }) {
  const styles = useStyles();
  const { t } = useTranslation('budgets');
  const nameOf = useCategoryName();
  const format = useFormatters();
  const currency = useSettingsStore((s) => s.currency);
  const { form, submit } = useBudgetEditor(target, month, onClose);
  const budgetType = useWatch({ control: form.control, name: 'budgetType' });

  // Field errors carry schema ids (`validation.<id>`) or service codes (`errors.<code>`).
  const errorText = (message: string | undefined): string | undefined => {
    if (!message) return undefined;
    const validation = VALIDATION_MESSAGES.find((id) => id === message);
    if (validation) return t(`validation.${validation}`);
    const code = ERROR_CODES.find((c) => `errors.${c}` === message);
    return code ? t(`errors.${code}`) : t('errors.saveFailed');
  };
  const rootError = form.formState.errors.root?.message;
  useAnnounce(errorText(rootError));

  const title =
    target.mode === 'edit'
      ? budgetType === 'overall'
        ? t('editor.editOverall')
        : t('editor.editCategory')
      : budgetType === 'overall'
        ? t('editor.createOverall')
        : t('editor.createCategory');

  const footer = (
    <>
      <AppButton
        label={t('editor.save')}
        onPress={() => void submit()}
        loading={form.formState.isSubmitting}
        fullWidth
      />
      {target.mode === 'edit' ? (
        <AppButton
          label={t('editor.delete')}
          variant="danger"
          onPress={() => onDelete(target)}
          fullWidth
        />
      ) : null}
    </>
  );

  return (
    <AppSheet visible onClose={onClose} title={title} footer={footer}>
      <AppText variant="bodySmall" color="textSecondary">
        {t('editor.forMonth', { month: format.monthYear(month) })}
      </AppText>

      {budgetType === 'category' ? (
        target.mode === 'edit' && target.category ? (
          <View style={styles.fixedCategory}>
            <CategoryIcon category={target.category} />
            <AppText variant="bodyMedium">{nameOf(target.category)}</AppText>
          </View>
        ) : (
          <Controller
            control={form.control}
            name="categoryId"
            render={({ field, fieldState }) => (
              <View style={styles.group}>
                <AppText variant="bodyMedium">{t('editor.category')}</AppText>
                {availableCategories.length === 0 ? (
                  <AppText variant="bodySmall" color="textSecondary">
                    {t('editor.noCategoriesLeft')}
                  </AppText>
                ) : (
                  <CategoryQuickPicker
                    type="expense"
                    categories={availableCategories}
                    selectedId={field.value}
                    onSelect={field.onChange}
                    accessibilityLabel={t('editor.category')}
                  />
                )}
                {fieldState.error ? (
                  <AppText variant="bodySmall" color="expenseText" accessibilityLiveRegion="polite">
                    {errorText(fieldState.error.message)}
                  </AppText>
                ) : null}
              </View>
            )}
          />
        )
      ) : null}

      <Controller
        control={form.control}
        name="amount"
        render={({ field, fieldState }) => (
          <AppInput
            label={t('editor.amount')}
            placeholder={t('editor.amountPlaceholder')}
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
          />
        )}
      />

      {rootError ? (
        <AppText
          variant="bodySmall"
          color="expenseText"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite">
          {errorText(rootError)}
        </AppText>
      ) : null}
    </AppSheet>
  );
}

const useStyles = makeStyles((t) => ({
  group: { gap: t.spacing.sm },
  fixedCategory: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
}));
