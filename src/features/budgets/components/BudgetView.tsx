import { PiggyBank, Plus, TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppHeader,
  AppLoading,
  AppScreen,
  AppText,
} from '@/components/ui';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { MonthSelector } from '@/features/dashboard/components/MonthSelector';
import { makeStyles } from '@/theme';

import type { BudgetEditorTarget } from '../hooks/useBudgetEditor';
import { useBudgetOverview } from '../hooks/useBudgetOverview';
import { useDeleteBudget } from '../hooks/useDeleteBudget';
import { BudgetAlertsCard } from './BudgetAlertsCard';
import { BudgetEditorSheet } from './BudgetEditorSheet';
import { CategoryBudgetRow, UnbudgetedRow } from './CategoryBudgetRow';
import { OverallBudgetCard } from './OverallBudgetCard';

/**
 * Budget screen: overall and category budgets vs actual expense spending for one month.
 * Any month can be selected, so past months show their preserved budgets (history).
 */
export function BudgetView({ initialMonth }: { initialMonth: Date }) {
  const styles = useStyles();
  const { t } = useTranslation('budgets');
  const [month, setMonth] = useState(initialMonth);
  const [editor, setEditor] = useState<BudgetEditorTarget | null>(null);
  const { overview, status, reload } = useBudgetOverview(month);
  const {
    categories: expenseCategories,
    error: categoriesError,
    retry: retryCategories,
  } = useCategories('expense');
  const confirmDelete = useDeleteBudget();
  const today = new Date();

  const budgetedIds = new Set(overview?.categories.map((c) => c.category.id) ?? []);
  const availableCategories = expenseCategories.filter((c) => !budgetedIds.has(c.id));
  const addCategoryBudget = (categoryId: number | null = null) =>
    setEditor({ mode: 'create', budgetType: 'category', categoryId });
  const addOverallBudget = () => setEditor({ mode: 'create', budgetType: 'overall' });

  let body;
  // Without categories the editor would offer no choices, so both loads must succeed.
  if (status === 'error' || categoriesError) {
    const retry = () => {
      if (status === 'error') reload();
      if (categoriesError) retryCategories();
    };
    body = (
      <AppEmptyState
        icon={TriangleAlert}
        tone="error"
        title={t('errors.loadTitle')}
        action={{ label: t('errors.retry'), onPress: retry }}
      />
    );
  } else if (overview === null) {
    body = <AppLoading />;
  } else {
    const { overallBudget } = overview;
    const hasBudgets = overallBudget !== null || overview.categories.length > 0;
    body = (
      <>
        {hasBudgets ? null : (
          <AppEmptyState icon={PiggyBank} title={t('empty.title')} message={t('empty.message')} />
        )}
        <OverallBudgetCard
          overview={overview}
          onCreate={addOverallBudget}
          onEdit={() =>
            overallBudget && setEditor({ mode: 'edit', budget: overallBudget, category: null })
          }
          onDelete={() => overallBudget && confirmDelete(overallBudget, null, month)}
        />
        <BudgetAlertsCard alerts={overview.alerts} />

        <View style={styles.section}>
          <SectionHeader title={t('categories.title')} />
          {overview.categories.length === 0 ? (
            <AppText variant="bodySmall" color="textSecondary">
              {t('categories.empty')}
            </AppText>
          ) : (
            <AppCard padding="md">
              {overview.categories.map((item) => (
                <CategoryBudgetRow
                  key={item.budget.id}
                  item={item}
                  onPress={() =>
                    setEditor({ mode: 'edit', budget: item.budget, category: item.category })
                  }
                />
              ))}
            </AppCard>
          )}
          <AppButton
            label={t('categories.add')}
            icon={Plus}
            variant="secondary"
            onPress={() => addCategoryBudget()}
            disabled={availableCategories.length === 0}
            fullWidth
          />
        </View>

        {overview.unbudgeted.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title={t('unbudgeted.title')} />
            <AppCard padding="md">
              {overview.unbudgeted.map((item) => (
                <UnbudgetedRow
                  key={item.category.id}
                  item={item}
                  onPress={() => addCategoryBudget(item.category.id)}
                />
              ))}
            </AppCard>
          </View>
        ) : null}
      </>
    );
  }

  return (
    <AppScreen header={<AppHeader title={t('title')} back />}>
      <MonthSelector month={month} onChange={setMonth} today={today} />
      {body}
      <BudgetEditorSheet
        target={editor}
        month={month}
        availableCategories={availableCategories}
        onClose={() => setEditor(null)}
        onDelete={(target) =>
          confirmDelete(target.budget, target.category, month, () => setEditor(null))
        }
      />
    </AppScreen>
  );
}

const useStyles = makeStyles((t) => ({
  section: { gap: t.spacing.md },
}));
