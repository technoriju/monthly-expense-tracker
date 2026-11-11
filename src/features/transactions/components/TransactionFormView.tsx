import { router } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import {
  AppButton,
  AppHeader,
  AppIconButton,
  AppScreen,
  AppSegmentedControl,
} from '@/components/ui';
import { makeStyles } from '@/theme';
import type { TransactionType } from '@/types/money';
import { toIsoDate } from '@/utils/dates';
import { minorToInputString } from '@/utils/money';

import { useDeleteTransaction } from '../hooks/useDeleteTransaction';
import { useTransactionForm } from '../hooks/useTransactionForm';
import type { TransactionFormValues } from '../schemas';
import type { Transaction } from '../types';
import { TransactionFormFields } from './TransactionFormFields';

export type TransactionFormMode =
  { kind: 'create'; initialType: TransactionType } | { kind: 'edit'; transaction: Transaction };

/**
 * Add / Edit Transaction screen body (design-reference row 1, col 4).
 * No category is pre-selected on create: the user must choose one deliberately.
 */
export function TransactionFormView({ mode }: { mode: TransactionFormMode }) {
  const styles = useStyles();
  const { t } = useTranslation('transactions');
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

        <TransactionFormFields
          control={control}
          categories={categories}
          categoriesLoading={categoriesLoading}
        />

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
  actions: { gap: t.spacing.sm },
}));
