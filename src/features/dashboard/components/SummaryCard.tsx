import { ArrowDown, ArrowUp } from 'lucide-react-native';
import { View } from 'react-native';

import { AppCard, AppIcon, AppText } from '@/components/ui';
import { useFormatters } from '@/hooks/useFormatters';
import { makeStyles } from '@/theme';
import type { MinorAmount, TransactionType } from '@/types/money';

export interface SummaryCardProps {
  type: TransactionType;
  amountMinor: MinorAmount;
  /** Already-translated label ("Income" / "Expense"). */
  label: string;
}

export function SummaryCard({ type, amountMinor, label }: SummaryCardProps) {
  const styles = useStyles();
  const format = useFormatters();
  const amount = format.money(amountMinor);
  const isIncome = type === 'income';

  return (
    <AppCard
      variant={type}
      style={styles.card}
      accessible
      accessibilityLabel={`${label}, ${amount}`}>
      <View style={[styles.badge, isIncome ? styles.badgeIncome : styles.badgeExpense]}>
        <AppIcon
          icon={isIncome ? ArrowDown : ArrowUp}
          size="sm"
          color="onPrimary"
          strokeWidth={3}
        />
      </View>
      <AppText variant="amountMedium" numberOfLines={1} adjustsFontSizeToFit constrainScale>
        {amount}
      </AppText>
      <AppText variant="bodySmall" color="textSecondary" numberOfLines={1}>
        {label}
      </AppText>
    </AppCard>
  );
}

const useStyles = makeStyles((t) => ({
  card: { flex: 1, alignItems: 'center', gap: t.spacing.xs },
  badge: {
    width: t.layout.iconSize.xl,
    height: t.layout.iconSize.xl,
    borderRadius: t.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: t.spacing.xs,
  },
  badgeIncome: { backgroundColor: t.colors.income },
  badgeExpense: { backgroundColor: t.colors.expense },
}));
