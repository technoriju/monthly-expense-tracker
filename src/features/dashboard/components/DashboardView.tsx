import { TriangleAlert } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppEmptyState, AppLoading, AppScreen } from '@/components/ui';
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
  const { t: tTx } = useTranslation('transactions');
  const { today, month, setMonth, summary, recentTransactions, status, reload } =
    useDashboardData();

  return (
    <AppScreen>
      <DashboardGreeting now={today} />
      <View style={styles.group}>
        <MonthSelector month={month} onChange={setMonth} today={today} />
        {status === 'error' ? (
          <AppEmptyState
            icon={TriangleAlert}
            tone="error"
            title={t('loadError')}
            action={{ label: tTx('history.retry'), onPress: reload }}
          />
        ) : summary === null ? (
          <AppLoading />
        ) : (
          <>
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
            <BalanceCard amountMinor={summary.balanceMinor} />
          </>
        )}
      </View>
      <QuickActions />
      <ChartPlaceholder />
      {summary !== null && status !== 'error' ? (
        <RecentTransactions transactions={recentTransactions} today={today} />
      ) : null}
    </AppScreen>
  );
}

const useStyles = makeStyles((t) => ({
  group: { gap: t.spacing.md },
  summaryRow: { flexDirection: 'row', gap: t.spacing.md },
}));
