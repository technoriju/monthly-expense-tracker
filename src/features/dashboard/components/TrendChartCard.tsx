import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { LineChart } from '@/components/charts/LineChart';
import { AppCard, AppText } from '@/components/ui';
import { useTrendLabels } from '@/features/reports/components/TrendCard';
import { monthPeriod } from '@/features/reports/period';
import type { Trend } from '@/features/reports/types';
import { useFormatters } from '@/hooks/useFormatters';
import { useUiStore } from '@/store/uiStore';
import { makeStyles, useTheme } from '@/theme';

/** Dashboard expense trend for the selected month (design-reference Dashboard). Opens Reports. */
export function TrendChartCard({ trend, month }: { trend: Trend; month: Date }) {
  const styles = useStyles();
  const { t } = useTranslation('dashboard');
  const { colors } = useTheme();
  const format = useFormatters();
  const setReportPeriod = useUiStore((s) => s.setReportPeriod);
  const { axisLabels } = useTrendLabels(trend);
  const values = trend.points.map((p) => p.expenseMinor);
  const total = values.reduce((sum, v) => sum + v, 0);

  const openReports = () => {
    setReportPeriod(monthPeriod(month));
    router.navigate('/reports');
  };

  return (
    <Pressable
      onPress={openReports}
      accessibilityRole="button"
      accessibilityHint={t('chart.openReports')}
      style={({ pressed }) => pressed && styles.pressed}>
      <AppCard style={styles.card}>
        <AppText variant="bodyMedium" accessibilityRole="header">
          {t('chart.title')}
        </AppText>
        {total === 0 ? (
          <AppText variant="bodySmall" color="textMuted" align="center" style={styles.empty}>
            {t('chart.empty')}
          </AppText>
        ) : (
          <LineChart
            values={values}
            color={colors.primary}
            labels={axisLabels}
            accessibilityLabel={t('chart.label', { total: format.money(total) })}
          />
        )}
      </AppCard>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  card: { gap: t.spacing.md },
  empty: { paddingVertical: t.spacing.xxl },
  pressed: { opacity: t.layout.pressedOpacity },
}));
