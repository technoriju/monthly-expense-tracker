import { Pencil, PiggyBank, Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppButton, AppCard, AppIconButton, AppText } from '@/components/ui';
import { useFormatters } from '@/hooks/useFormatters';
import { makeStyles } from '@/theme';

import type { MonthBudgetOverview } from '../types';
import { BudgetProgressBar, BudgetStatusBadge, STATUS_TONES } from './BudgetProgressBar';

export interface OverallBudgetCardProps {
  overview: MonthBudgetOverview;
  onCreate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function Figure({ label, value, color }: { label: string; value: string; color?: 'expense' }) {
  const styles = useStyles();
  return (
    <View style={styles.figure}>
      <AppText variant="caption" color="textSecondary" numberOfLines={1}>
        {label}
      </AppText>
      <AppText variant="bodyMedium" color={color} numberOfLines={1} constrainScale>
        {value}
      </AppText>
    </View>
  );
}

/** Overall monthly budget: budget, spent, remaining, % used, status, edit/delete. */
export function OverallBudgetCard({
  overview,
  onCreate,
  onEdit,
  onDelete,
}: OverallBudgetCardProps) {
  const styles = useStyles();
  const { t } = useTranslation('budgets');
  const format = useFormatters();
  const { overall, overallBudget } = overview;

  if (!overallBudget || overall.budgetMinor === null || overall.remainingMinor === null) {
    return (
      <AppCard style={styles.card}>
        <View style={styles.titleRow}>
          <AppText variant="heading3" accessibilityRole="header" style={styles.flex}>
            {t('overall.notSet')}
          </AppText>
        </View>
        <AppText variant="bodySmall" color="textSecondary">
          {t('overall.notSetHint')}
        </AppText>
        <AppText variant="bodySmall">
          {t('overall.spentThisMonth', { amount: format.money(overall.spentMinor) })}
        </AppText>
        <AppButton label={t('overall.set')} icon={PiggyBank} onPress={onCreate} fullWidth />
      </AppCard>
    );
  }

  const over = overall.remainingMinor < 0;
  const tone = STATUS_TONES[overall.status];

  return (
    <AppCard style={styles.card}>
      <View style={styles.titleRow}>
        <AppText variant="heading3" accessibilityRole="header" style={styles.flex}>
          {t('overall.title')}
        </AppText>
        <AppIconButton
          icon={Pencil}
          size="md"
          variant="soft"
          accessibilityLabel={t('overall.editLabel')}
          onPress={onEdit}
        />
        <AppIconButton
          icon={Trash2}
          size="md"
          variant="soft"
          accessibilityLabel={t('overall.deleteLabel')}
          onPress={onDelete}
        />
      </View>
      <AppText variant="amountLarge" constrainScale numberOfLines={1}>
        {format.money(overall.budgetMinor)}
      </AppText>
      <BudgetProgressBar percent={overall.percent} status={overall.status} />
      <View style={styles.titleRow}>
        <AppText variant="bodySmall" color={tone.foreground} style={styles.flex}>
          {t('labels.used', { percent: overall.percent ?? 0 })}
        </AppText>
        <BudgetStatusBadge status={overall.status} />
      </View>
      <View style={styles.figures}>
        <Figure label={t('labels.spent')} value={format.money(overall.spentMinor)} />
        <Figure
          label={over ? t('labels.overBy') : t('labels.remaining')}
          value={format.money(Math.abs(overall.remainingMinor))}
          color={over ? 'expense' : undefined}
        />
      </View>
    </AppCard>
  );
}

const useStyles = makeStyles((t) => ({
  card: { gap: t.spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  flex: { flex: 1 },
  figures: { flexDirection: 'row', gap: t.spacing.md },
  figure: { flex: 1, gap: t.spacing.xs },
}));
