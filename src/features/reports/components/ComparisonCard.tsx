import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppCard, AppIcon, AppText, type TextColorToken } from '@/components/ui';
import { useFormatters } from '@/hooks/useFormatters';
import { makeStyles } from '@/theme';

import type { MetricComparison, PeriodComparison } from '../types';

type Metric = 'income' | 'expense' | 'net';

/** More income/net is good; more expense is bad. */
function toneOf(metric: Metric, c: MetricComparison): TextColorToken {
  if (c.direction === 'same') return 'textSecondary';
  const good = metric === 'expense' ? c.direction === 'down' : c.direction === 'up';
  return good ? 'incomeText' : 'expenseText';
}

function ComparisonRow({ metric, comparison }: { metric: Metric; comparison: MetricComparison }) {
  const styles = useStyles();
  const { t } = useTranslation('reports');
  const format = useFormatters();
  const tone = toneOf(metric, comparison);
  const icon =
    comparison.direction === 'up'
      ? ArrowUpRight
      : comparison.direction === 'down'
        ? ArrowDownRight
        : Minus;
  const absDelta = format.money(Math.abs(comparison.deltaMinor));

  // A percentage needs a non-zero baseline; without one (and for net balance, whose sign can
  // flip) only the amount difference is shown.
  let change: string;
  if (comparison.direction === 'same') {
    change = t('comparison.same');
  } else if (metric !== 'net' && comparison.changeBp !== null) {
    const percent = format.percentBp(Math.abs(comparison.changeBp));
    change =
      comparison.direction === 'up'
        ? t('comparison.up', { percent })
        : t('comparison.down', { percent });
  } else {
    change =
      comparison.direction === 'up'
        ? t('comparison.more', { amount: absDelta })
        : t('comparison.less', { amount: absDelta });
  }

  const label = t(`comparison.${metric}`);
  const current = format.money(comparison.currentMinor, metric === 'net' ? 'exceptZero' : 'auto');
  const previous = t('comparison.previousValue', {
    amount: format.money(comparison.previousMinor, metric === 'net' ? 'exceptZero' : 'auto'),
  });

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={[label, current, previous, change].join(', ')}>
      <View style={styles.flex}>
        <AppText variant="bodyMedium">{label}</AppText>
        <AppText variant="caption" color="textSecondary">
          {previous}
        </AppText>
      </View>
      <View style={styles.end}>
        <AppText variant="bodyMedium" numberOfLines={1} constrainScale>
          {current}
        </AppText>
        <View style={styles.change}>
          <AppIcon icon={icon} size="sm" color={tone} />
          <AppText variant="caption" color={tone} numberOfLines={2} style={styles.changeText}>
            {change}
          </AppText>
        </View>
      </View>
    </View>
  );
}

/** Month-over-month (or period-over-period) comparison of income, expenses and net balance. */
export function ComparisonCard({
  comparison,
  previousLabel,
}: {
  comparison: PeriodComparison;
  /** Already-formatted name of the previous period. */
  previousLabel: string;
}) {
  const styles = useStyles();
  const { t } = useTranslation('reports');
  return (
    <AppCard style={styles.card}>
      <View>
        <AppText variant="heading3" accessibilityRole="header">
          {t('comparison.title')}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {t('comparison.previousRange', { range: previousLabel })}
        </AppText>
      </View>
      {(['income', 'expense', 'net'] as const).map((metric) => (
        <ComparisonRow key={metric} metric={metric} comparison={comparison[metric]} />
      ))}
      {!comparison.hasPreviousData ? (
        <AppText variant="caption" color="textSecondary">
          {t('comparison.noPreviousData')}
        </AppText>
      ) : null}
    </AppCard>
  );
}

const useStyles = makeStyles((t) => ({
  card: { gap: t.spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: t.spacing.md },
  flex: { flex: 1 },
  end: { alignItems: 'flex-end', flexShrink: 1, gap: t.spacing.xs },
  change: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs },
  changeText: { flexShrink: 1, textAlign: 'right' },
}));
