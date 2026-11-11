import { router } from 'expo-router';
import { ChartPie, TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import {
  AppCard,
  AppEmptyState,
  AppHeader,
  AppLoading,
  AppScreen,
  AppSegmentedControl,
  AppText,
} from '@/components/ui';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon';
import { useCategoryName } from '@/features/categories/hooks/useCategoryName';
import { useFormatters } from '@/hooks/useFormatters';
import { makeStyles, useTheme } from '@/theme';
import type { TransactionType } from '@/types/money';
import type { DateRange } from '@/utils/dates';

import { shareColor } from '../chartColors';
import { useReport } from '../hooks/useReport';
import type { CategoryShare } from '../types';
import { CategoryDonut } from './CategoryDonut';
import { ReportPeriodSelector } from './ReportPeriodSelector';

function ShareRow({
  share,
  rank,
  range,
}: {
  share: CategoryShare;
  rank: number;
  range: DateRange;
}) {
  const styles = useStyles();
  const { t } = useTranslation('reports');
  const { colors } = useTheme();
  const nameOf = useCategoryName();
  const format = useFormatters();
  const name = nameOf(share.category);
  const amount = format.money(share.totalMinor);
  const count = t('breakdown.transactions', { count: share.count });
  const color = shareColor(rank, colors);

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/transactions',
          params: {
            categoryId: String(share.category.id),
            type: share.category.type,
            from: range.from,
            to: range.to,
          },
        })
      }
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${share.percent}%, ${amount}, ${count}`}
      accessibilityHint={t('breakdown.rowHint')}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <CategoryIcon category={share.category} />
      <View style={styles.rowBody}>
        <View style={styles.rowLine}>
          <AppText variant="bodyMedium" style={styles.flex} numberOfLines={1}>
            {name}
          </AppText>
          <AppText variant="bodyMedium" numberOfLines={1} constrainScale>
            {amount}
          </AppText>
        </View>
        <View style={styles.track}>
          <View
            style={[styles.bar, { width: `${share.fraction * 100}%`, backgroundColor: color }]}
          />
        </View>
        <View style={styles.rowLine}>
          <AppText variant="caption" color="textSecondary" style={styles.flex}>
            {count}
          </AppText>
          <AppText variant="caption" color="textSecondary">
            {`${share.percent}%`}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}

/** Category Breakdown (design-reference row 2, col 3) for the shared report period. */
export function CategoryBreakdownView({ initialType }: { initialType: TransactionType }) {
  const styles = useStyles();
  const { t } = useTranslation('reports');
  const { period, setPeriod, report, status, reload } = useReport();
  const [type, setType] = useState<TransactionType>(initialType);
  const today = new Date();

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
  } else {
    const shares = type === 'expense' ? report.expenseCategories : report.incomeCategories;
    const total = type === 'expense' ? report.summary.expenseMinor : report.summary.incomeMinor;
    body =
      shares.length === 0 ? (
        <AppEmptyState
          icon={ChartPie}
          title={type === 'expense' ? t('breakdown.emptyExpense') : t('breakdown.emptyIncome')}
        />
      ) : (
        <>
          <View style={styles.donut}>
            <CategoryDonut type={type} shares={shares} totalMinor={total} size="large" />
          </View>
          <AppCard padding="md">
            {shares.map((share, rank) => (
              <ShareRow key={share.category.id} share={share} rank={rank} range={report.range} />
            ))}
          </AppCard>
        </>
      );
  }

  return (
    <AppScreen header={<AppHeader title={t('breakdown.title')} back />}>
      <ReportPeriodSelector period={period} onChange={setPeriod} today={today} />
      <AppSegmentedControl
        options={[
          { value: 'expense', label: t('breakdown.expense') },
          { value: 'income', label: t('breakdown.income') },
        ]}
        value={type}
        onChange={setType}
        accessibilityLabel={t('breakdown.typeLabel')}
      />
      {body}
    </AppScreen>
  );
}

const useStyles = makeStyles((t) => ({
  donut: { alignItems: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    paddingVertical: t.spacing.sm,
    minHeight: t.layout.minTouchTarget,
  },
  rowBody: { flex: 1, gap: t.spacing.xs },
  rowLine: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  flex: { flex: 1 },
  track: {
    height: t.layout.progressBarHeight,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.primarySoft,
    overflow: 'hidden',
  },
  bar: { height: '100%', borderRadius: t.radius.pill },
  pressed: { opacity: t.layout.pressedOpacity },
}));
