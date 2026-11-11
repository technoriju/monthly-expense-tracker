import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppScreen } from '@/components/ui';
import { makeStyles } from '@/theme';

import { useDashboardData } from '../hooks/useDashboardData';
import { BalanceCard } from './BalanceCard';
import { ChartPlaceholder } from './ChartPlaceholder';
import { DashboardGreeting } from './DashboardGreeting';
import { MonthSelector } from './MonthSelector';
import { QuickActions } from './QuickActions';
import { RecentTransactions } from './RecentTransactions';
import { SummaryCard } from './SummaryCard';

export function DashboardView() {
  const styles = useStyles();
  const { t } = useTranslation('dashboard');
  const { today, month, summary, recentTransactions } = useDashboardData();

  return (
    <AppScreen>
      <DashboardGreeting now={today} />
      <View style={styles.group}>
        <MonthSelector month={month} />
        <View style={styles.summaryRow}>
          <SummaryCard
            type="income"
            amountMinor={summary.incomeMinor}
            label={t('summary.income')}
          />
          <SummaryCard
            type="expense"
            amountMinor={summary.expenseMinor}
            label={t('summary.expense')}
          />
        </View>
        <BalanceCard amountMinor={summary.remainingMinor} />
      </View>
      <QuickActions />
      <ChartPlaceholder />
      <RecentTransactions transactions={recentTransactions} today={today} />
    </AppScreen>
  );
}

const useStyles = makeStyles((t) => ({
  group: { gap: t.spacing.md },
  summaryRow: { flexDirection: 'row', gap: t.spacing.md },
}));
