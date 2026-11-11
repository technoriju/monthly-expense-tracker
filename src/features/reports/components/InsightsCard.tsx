import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppCard, AppText } from '@/components/ui';
import { useCategoryName } from '@/features/categories/hooks/useCategoryName';
import { useFormatters } from '@/hooks/useFormatters';
import { makeStyles } from '@/theme';

import type { DayAmount, Report } from '../types';

interface InsightRowProps {
  label: string;
  value: string;
  caption?: string;
}

function InsightRow({ label, value, caption }: InsightRowProps) {
  const styles = useStyles();
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={[label, value, caption].filter(Boolean).join(', ')}>
      <View style={styles.flex}>
        <AppText variant="bodySmall" color="textSecondary">
          {label}
        </AppText>
        {caption ? (
          <AppText variant="caption" color="textMuted">
            {caption}
          </AppText>
        ) : null}
      </View>
      <AppText variant="bodyMedium" numberOfLines={1} constrainScale style={styles.value}>
        {value}
      </AppText>
    </View>
  );
}

/** Average daily spend, highest/lowest day, top categories and transaction count. */
export function InsightsCard({ report }: { report: Report }) {
  const styles = useStyles();
  const { t } = useTranslation('reports');
  const nameOf = useCategoryName();
  const format = useFormatters();
  const { summary } = report;
  const none = t('insights.none');
  const day = (d: DayAmount | null) => (d ? format.money(d.amountMinor) : none);
  const dayCaption = (d: DayAmount | null) => (d ? format.longDate(d.date) : undefined);
  const topExpense = report.expenseCategories[0];
  const topIncome = report.incomeCategories[0];

  return (
    <AppCard style={styles.card}>
      <AppText variant="heading3" accessibilityRole="header">
        {t('insights.title')}
      </AppText>
      <InsightRow
        label={t('insights.avgDaily')}
        value={format.money(summary.avgDailyExpenseMinor)}
        caption={t('insights.avgDailyCaption', { count: summary.daysCounted })}
      />
      <InsightRow
        label={t('insights.highestDay')}
        value={day(summary.highestExpenseDay)}
        caption={dayCaption(summary.highestExpenseDay)}
      />
      <InsightRow
        label={t('insights.lowestDay')}
        value={day(summary.lowestExpenseDay)}
        caption={dayCaption(summary.lowestExpenseDay)}
      />
      <InsightRow
        label={t('insights.topExpense')}
        value={topExpense ? format.money(topExpense.totalMinor) : none}
        caption={topExpense ? nameOf(topExpense.category) : undefined}
      />
      <InsightRow
        label={t('insights.topIncome')}
        value={topIncome ? format.money(topIncome.totalMinor) : none}
        caption={topIncome ? nameOf(topIncome.category) : undefined}
      />
      <InsightRow label={t('insights.transactionCount')} value={String(summary.transactionCount)} />
    </AppCard>
  );
}

const useStyles = makeStyles((t) => ({
  card: { gap: t.spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  flex: { flex: 1 },
  value: { flexShrink: 0 },
}));
