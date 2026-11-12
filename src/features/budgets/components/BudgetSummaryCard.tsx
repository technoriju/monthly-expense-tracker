import { router } from 'expo-router';
import { ChevronRight, TriangleAlert } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppCard, AppIcon, AppText } from '@/components/ui';
import { useFormatters } from '@/hooks/useFormatters';
import { makeStyles } from '@/theme';

import { useBudgetOverview } from '../hooks/useBudgetOverview';
import { BudgetProgressBar, BudgetStatusBadge } from './BudgetProgressBar';

export interface BudgetSummaryCardProps {
  month: Date;
  /** Render nothing when the month has no budgets (dashboard). */
  hideWhenEmpty?: boolean;
}

/**
 * Compact budget card (Dashboard, Reports): overall progress, remaining, warnings.
 * Opens the Budget screen for `month`. Uses the same service as the Budget screen.
 */
export function BudgetSummaryCard({ month, hideWhenEmpty = false }: BudgetSummaryCardProps) {
  const styles = useStyles();
  const { t } = useTranslation('budgets');
  const format = useFormatters();
  const { overview } = useBudgetOverview(month);

  if (!overview) return null;
  const { overall, overallBudget, alerts } = overview;
  const hasBudgets = overallBudget !== null || overview.categories.length > 0;
  if (hideWhenEmpty && !hasBudgets) return null;

  const remaining = overall.remainingMinor;
  const open = () => router.push({ pathname: '/budgets', params: { month: overview.month } });

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityHint={t('summary.openHint')}
      style={({ pressed }) => pressed && styles.pressed}>
      <AppCard style={styles.card}>
        <View style={styles.row}>
          <AppText variant="heading3" style={styles.flex} numberOfLines={1}>
            {t('summary.title')}
          </AppText>
          {overallBudget ? <BudgetStatusBadge status={overall.status} /> : null}
          <AppIcon icon={ChevronRight} size="md" color="textSecondary" mirrorInRTL />
        </View>
        {overallBudget && overall.budgetMinor !== null && remaining !== null ? (
          <>
            <AppText variant="bodySmall" color="textSecondary">
              {t('labels.spentOf', {
                spent: format.money(overall.spentMinor),
                budget: format.money(overall.budgetMinor),
              })}
            </AppText>
            <BudgetProgressBar percent={overall.percent} status={overall.status} />
            <View style={styles.row}>
              <AppText variant="caption" color="textSecondary" style={styles.flex}>
                {t('labels.used', { percent: overall.percent ?? 0 })}
              </AppText>
              <AppText
                variant="bodyMedium"
                color={remaining < 0 ? 'expense' : 'textPrimary'}
                numberOfLines={1}>
                {remaining < 0
                  ? t('summary.overBy', { amount: format.money(-remaining) })
                  : t('summary.remaining', { amount: format.money(remaining) })}
              </AppText>
            </View>
          </>
        ) : (
          <AppText variant="bodySmall" color="textSecondary">
            {hasBudgets ? t('overall.notSet') : t('summary.setUpHint')}
          </AppText>
        )}
        {alerts.length > 0 ? (
          <View style={styles.row}>
            <AppIcon
              icon={TriangleAlert}
              size="sm"
              color={alerts[0]?.level === 100 ? 'expense' : 'accent'}
            />
            <AppText
              variant="bodySmall"
              color={alerts[0]?.level === 100 ? 'expense' : 'accent'}
              style={styles.flex}>
              {t('summary.warnings', { count: alerts.length })}
            </AppText>
          </View>
        ) : null}
      </AppCard>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  card: { gap: t.spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  flex: { flex: 1 },
  pressed: { opacity: t.layout.pressedOpacity },
}));
