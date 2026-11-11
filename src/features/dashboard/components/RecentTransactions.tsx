import { router } from 'expo-router';
import { Inbox } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { SectionHeader } from '@/components/layout/SectionHeader';
import { AppCard, AppEmptyState } from '@/components/ui';
import { TransactionRow } from '@/features/transactions/components/TransactionRow';
import type { TransactionPreview } from '@/features/transactions/types';
import { makeStyles } from '@/theme';

export interface RecentTransactionsProps {
  transactions: TransactionPreview[];
  today: Date;
}

export function RecentTransactions({ transactions, today }: RecentTransactionsProps) {
  const styles = useStyles();
  const { t } = useTranslation('dashboard');
  return (
    <View style={styles.root}>
      <SectionHeader title={t('recent.title')} onSeeAll={() => router.push('/transactions')} />
      <AppCard padding="md">
        {transactions.length === 0 ? (
          <AppEmptyState icon={Inbox} title={t('recent.empty')} />
        ) : (
          transactions.map((tx) => <TransactionRow key={tx.id} transaction={tx} today={today} />)
        )}
      </AppCard>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: t.spacing.md },
}));
