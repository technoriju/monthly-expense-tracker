import { router } from 'expo-router';
import { CalendarDays, ChartPie, Share2, TriangleAlert } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppEmptyState, AppHeader, AppIconButton, AppLoading, AppScreen } from '@/components/ui';
import { BudgetSummaryCard } from '@/features/budgets/components/BudgetSummaryCard';
import { SummaryCard } from '@/features/dashboard/components/SummaryCard';
import { makeStyles } from '@/theme';
import { fromIsoDate } from '@/utils/dates';

import { useExportCsv } from '../hooks/useExportCsv';
import { useReport } from '../hooks/useReport';
import { monthPeriod, previousRange, shiftPeriod } from '../period';
import type { ReportPeriod, TrendPoint } from '../types';
import { CategoryBreakdownCard } from './CategoryBreakdownCard';
import { ComparisonCard } from './ComparisonCard';
import { InsightsCard } from './InsightsCard';
import { NetSummaryCard } from './NetSummaryCard';
import { ReportPeriodSelector, usePeriodLabel } from './ReportPeriodSelector';
import { TrendCard } from './TrendCard';

function previousPeriod(period: ReportPeriod): ReportPeriod {
  return period.kind === 'custom'
    ? { kind: 'custom', ...previousRange(period) }
    : shiftPeriod(period, -1);
}

/** Reports tab (design-reference row 2, col 2). */
export function ReportsView() {
  const styles = useStyles();
  const { t } = useTranslation('reports');
  const { period, setPeriod, report, status, reload } = useReport();
  const { exportCsv, exporting } = useExportCsv();
  const labelOf = usePeriodLabel();
  const today = new Date();
  // Budgets are monthly: a month period uses that month, other periods the current month.
  const budgetMonth = period.kind === 'month' ? fromIsoDate(period.month) : today;

  const openPoint = (point: TrendPoint) => {
    if (report?.trend.granularity === 'day') {
      router.push({ pathname: '/reports/calendar', params: { date: point.key } });
    } else {
      setPeriod(monthPeriod(fromIsoDate(point.start)));
    }
  };

  const header = (
    <AppHeader
      title={t('title')}
      right={
        <View style={styles.actions}>
          <AppIconButton
            icon={CalendarDays}
            variant="soft"
            accessibilityLabel={t('calendar.open')}
            onPress={() => router.push('/reports/calendar')}
          />
          <AppIconButton
            icon={Share2}
            variant="soft"
            accessibilityLabel={t('export.button')}
            onPress={() => void exportCsv()}
            disabled={exporting || status !== 'ready'}
          />
        </View>
      }
    />
  );

  let body;
  if (status === 'error') {
    body = (
      <AppEmptyState
        icon={TriangleAlert}
        tone="error"
        title={t('error.title')}
        action={{ label: t('error.retry'), onPress: reload }}
      />
    );
  } else if (report === null) {
    body = <AppLoading />;
  } else if (report.summary.transactionCount === 0) {
    body = (
      <>
        <AppEmptyState
          icon={ChartPie}
          title={t('empty.title')}
          message={t('empty.message')}
          action={{ label: t('empty.action'), onPress: () => router.push('/transaction/new') }}
        />
        <BudgetSummaryCard month={budgetMonth} />
      </>
    );
  } else {
    body = (
      <>
        <View style={styles.summaryRow}>
          <SummaryCard
            type="income"
            amountMinor={report.summary.incomeMinor}
            label={t('summary.income')}
          />
          <SummaryCard
            type="expense"
            amountMinor={report.summary.expenseMinor}
            label={t('summary.expense')}
          />
        </View>
        <NetSummaryCard summary={report.summary} />
        <BudgetSummaryCard month={budgetMonth} />
        <CategoryBreakdownCard report={report} />
        <TrendCard trend={report.trend} onOpenPoint={openPoint} />
        <ComparisonCard
          comparison={report.comparison}
          previousLabel={labelOf(previousPeriod(period))}
        />
        <InsightsCard report={report} />
      </>
    );
  }

  return (
    <AppScreen header={header}>
      <ReportPeriodSelector period={period} onChange={setPeriod} today={today} />
      {body}
    </AppScreen>
  );
}

const useStyles = makeStyles((t) => ({
  actions: { flexDirection: 'row', gap: t.spacing.sm },
  summaryRow: { flexDirection: 'row', gap: t.spacing.md },
}));
