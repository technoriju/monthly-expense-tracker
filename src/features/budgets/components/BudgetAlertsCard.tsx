import { TriangleAlert } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppCard, AppIcon, AppText } from '@/components/ui';
import { useCategoryName } from '@/features/categories/hooks/useCategoryName';
import { makeStyles } from '@/theme';

import type { BudgetAlert } from '../types';

/** Translated text for one alert (one per budget, at its highest reached threshold). */
export function useAlertText() {
  const { t } = useTranslation('budgets');
  const nameOf = useCategoryName();
  return (alert: BudgetAlert): string =>
    alert.kind === 'overall'
      ? t(`alerts.overall.level${alert.level}`, { percent: alert.percent })
      : t(`alerts.category.level${alert.level}`, {
          percent: alert.percent,
          category: nameOf(alert.category),
        });
}

/** In-app warnings for budgets at 80%, 90% and 100%+ of their limit. */
export function BudgetAlertsCard({ alerts }: { alerts: readonly BudgetAlert[] }) {
  const styles = useStyles();
  const { t } = useTranslation('budgets');
  const textOf = useAlertText();
  if (alerts.length === 0) return null;

  return (
    <AppCard style={styles.card}>
      <AppText variant="heading3" accessibilityRole="header">
        {t('alerts.title')}
      </AppText>
      {alerts.map((alert) => {
        const color = alert.level === 100 ? 'expenseText' : 'accentText';
        return (
          <View key={alert.budgetId} style={styles.row}>
            <AppIcon icon={TriangleAlert} size="sm" color={color} />
            <AppText variant="bodySmall" color={color} style={styles.flex}>
              {textOf(alert)}
            </AppText>
          </View>
        );
      })}
    </AppCard>
  );
}

const useStyles = makeStyles((t) => ({
  card: { gap: t.spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: t.spacing.sm },
  flex: { flex: 1 },
}));
