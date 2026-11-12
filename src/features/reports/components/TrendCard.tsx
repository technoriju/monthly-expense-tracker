import { ArrowRight } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { LineChart } from '@/components/charts/LineChart';
import { AppCard, AppIcon, AppSegmentedControl, AppText } from '@/components/ui';
import { useFormatters } from '@/hooks/useFormatters';
import { makeStyles, useTheme } from '@/theme';
import type { TransactionType } from '@/types/money';
import { fromIsoDate, type IsoDate } from '@/utils/dates';

import type { Trend, TrendPoint } from '../types';

/** Day numbers labelled on a daily axis (plus the last day). */
const DAY_TICKS = new Set([1, 7, 14, 21]);
/** Monthly axes with more points than this label every other month. */
const MAX_MONTH_LABELS = 12;

export interface TrendCardProps {
  trend: Trend;
  /** Opens a daily point (calendar day) or a monthly point (that month's report). */
  onOpenPoint: (point: TrendPoint) => void;
}

export function amountOf(point: TrendPoint, series: TransactionType): number {
  return series === 'expense' ? point.expenseMinor : point.incomeMinor;
}

/** Hook returning axis/label helpers for a trend's points. */
export function useTrendLabels(trend: Trend) {
  const format = useFormatters();
  const last = trend.points.length - 1;
  const pointName = (p: TrendPoint) =>
    trend.granularity === 'day' ? format.longDate(p.key) : format.monthYear(fromIsoDate(p.start));
  const axisLabel = (p: TrendPoint, i: number): string | null => {
    if (trend.granularity === 'day') {
      const day = fromIsoDate(p.key).getDate();
      return DAY_TICKS.has(day) || i === last ? format.dayOfMonth(p.key) : null;
    }
    if (trend.points.length > MAX_MONTH_LABELS && i % 2 === 1) return null;
    return format.monthShort(fromIsoDate(p.start));
  };
  return { pointName, axisLabels: trend.points.map(axisLabel) };
}

/** Expense/Income trend line with tappable points (design-reference "Expense Trend"). */
export function TrendCard({ trend, onOpenPoint }: TrendCardProps) {
  const styles = useStyles();
  const { t } = useTranslation('reports');
  const { colors } = useTheme();
  const format = useFormatters();
  const [series, setSeries] = useState<TransactionType>('expense');
  const [selected, setSelected] = useState<IsoDate | null>(null);
  const { pointName, axisLabels } = useTrendLabels(trend);

  const values = trend.points.map((p) => amountOf(p, series));
  const total = values.reduce((sum, v) => sum + v, 0);
  const selectedIndex = trend.points.findIndex((p) => p.key === selected);
  const selectedPoint = selectedIndex >= 0 ? trend.points[selectedIndex] : undefined;
  const seriesLabel = t(`trend.${series}`);

  return (
    <AppCard style={styles.card}>
      <AppText variant="heading3" accessibilityRole="header">
        {trend.granularity === 'day' ? t('trend.dailyTitle') : t('trend.monthlyTitle')}
      </AppText>
      <AppSegmentedControl
        options={[
          { value: 'expense', label: t('trend.expense') },
          { value: 'income', label: t('trend.income') },
        ]}
        value={series}
        onChange={setSeries}
        accessibilityLabel={t('trend.seriesLabel')}
      />
      {total === 0 ? (
        <AppText variant="bodySmall" color="textSecondary" align="center" style={styles.empty}>
          {series === 'expense' ? t('trend.emptyExpense') : t('trend.emptyIncome')}
        </AppText>
      ) : (
        <>
          <LineChart
            values={values}
            color={series === 'expense' ? colors.primary : colors.income}
            labels={axisLabels}
            selectedIndex={selectedIndex >= 0 ? selectedIndex : null}
            onSelect={(i) => setSelected(trend.points[i]?.key ?? null)}
            pointLabel={(i) => {
              const p = trend.points[i];
              return p
                ? t('trend.pointLabel', {
                    label: pointName(p),
                    amount: format.money(amountOf(p, series)),
                  })
                : '';
            }}
            accessibilityLabel={t('trend.chartLabel', {
              series: seriesLabel,
              total: format.money(total),
            })}
          />
          {selectedPoint ? (
            <Pressable
              onPress={() => onOpenPoint(selectedPoint)}
              accessibilityRole="link"
              accessibilityHint={
                trend.granularity === 'day' ? t('trend.dayHint') : t('trend.monthHint')
              }
              style={({ pressed }) => [styles.detail, pressed && styles.pressed]}>
              <AppText variant="bodySmall" style={styles.flex} numberOfLines={1}>
                {t('trend.selected', {
                  label: pointName(selectedPoint),
                  amount: format.money(amountOf(selectedPoint, series)),
                })}
              </AppText>
              <AppText variant="bodySmall" color="primaryText">
                {t('trend.open')}
              </AppText>
              <AppIcon icon={ArrowRight} size="sm" color="primary" mirrorInRTL />
            </Pressable>
          ) : (
            <AppText variant="caption" color="textSecondary" align="center">
              {t('trend.tapHint')}
            </AppText>
          )}
        </>
      )}
    </AppCard>
  );
}

const useStyles = makeStyles((t) => ({
  card: { gap: t.spacing.md },
  empty: { paddingVertical: t.spacing.lg },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
    minHeight: t.layout.minTouchTarget,
    paddingHorizontal: t.spacing.md,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.primarySoft,
  },
  flex: { flex: 1 },
  pressed: { opacity: t.layout.pressedOpacity },
}));
