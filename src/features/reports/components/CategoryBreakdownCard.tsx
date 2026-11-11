import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Legend } from '@/components/charts/Legend';
import { AppCard, AppSegmentedControl, AppText } from '@/components/ui';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { useCategoryName } from '@/features/categories/hooks/useCategoryName';
import { useFormatters } from '@/hooks/useFormatters';
import { makeStyles, useTheme } from '@/theme';
import type { TransactionType } from '@/types/money';

import { shareColor } from '../chartColors';
import type { Report } from '../types';
import { CategoryDonut } from './CategoryDonut';

/** Rows shown in the legend on the Reports screen; the breakdown screen lists all. */
const LEGEND_ROWS = 4;

/** Reports card: Expense/Income toggle, donut with total, top categories legend. */
export function CategoryBreakdownCard({ report }: { report: Report }) {
  const styles = useStyles();
  const { t } = useTranslation('reports');
  const { colors } = useTheme();
  const nameOf = useCategoryName();
  const format = useFormatters();
  const [type, setType] = useState<TransactionType>('expense');
  const shares = type === 'expense' ? report.expenseCategories : report.incomeCategories;
  const totalMinor = type === 'expense' ? report.summary.expenseMinor : report.summary.incomeMinor;

  return (
    <AppCard style={styles.card}>
      <SectionHeader
        title={t('breakdown.cardTitle')}
        onSeeAll={() => router.push({ pathname: '/reports/categories', params: { type } })}
      />
      <AppSegmentedControl
        options={[
          { value: 'expense', label: t('breakdown.expense') },
          { value: 'income', label: t('breakdown.income') },
        ]}
        value={type}
        onChange={setType}
        accessibilityLabel={t('breakdown.typeLabel')}
      />
      {shares.length === 0 ? (
        <AppText variant="bodySmall" color="textSecondary" align="center" style={styles.empty}>
          {type === 'expense' ? t('breakdown.emptyExpense') : t('breakdown.emptyIncome')}
        </AppText>
      ) : (
        <View style={styles.body}>
          <CategoryDonut type={type} shares={shares} totalMinor={totalMinor} />
          <View style={styles.legend}>
            <Legend
              items={shares.slice(0, LEGEND_ROWS).map((s, rank) => ({
                key: String(s.category.id),
                color: shareColor(rank, colors),
                label: nameOf(s.category),
                values: [`${s.percent}%`],
              }))}
            />
            {shares.length > LEGEND_ROWS ? (
              <AppText variant="caption" color="textSecondary">
                {t('breakdown.otherCategories')} ·{' '}
                {format.money(shares.slice(LEGEND_ROWS).reduce((sum, s) => sum + s.totalMinor, 0))}
              </AppText>
            ) : null}
          </View>
        </View>
      )}
    </AppCard>
  );
}

const useStyles = makeStyles((t) => ({
  card: { gap: t.spacing.md },
  body: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.lg },
  legend: { flex: 1, gap: t.spacing.sm },
  empty: { paddingVertical: t.spacing.lg },
}));
