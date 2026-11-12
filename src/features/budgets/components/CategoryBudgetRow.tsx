import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon';
import { useCategoryName } from '@/features/categories/hooks/useCategoryName';
import { useFormatters } from '@/hooks/useFormatters';
import { makeStyles } from '@/theme';

import type { CategoryBudgetProgress, UnbudgetedSpending } from '../types';
import { BudgetProgressBar, BudgetStatusBadge, STATUS_TONES } from './BudgetProgressBar';

/** Category budget: spent of budget, progress, % used and status. Tap to edit. */
export function CategoryBudgetRow({
  item,
  onPress,
}: {
  item: CategoryBudgetProgress;
  onPress: () => void;
}) {
  const styles = useStyles();
  const { t } = useTranslation('budgets');
  const nameOf = useCategoryName();
  const format = useFormatters();
  const { progress } = item;
  const name = nameOf(item.category);
  const spentOf = t('labels.spentOf', {
    spent: format.money(progress.spentMinor),
    budget: format.money(progress.budgetMinor ?? 0),
  });
  const used = t('labels.used', { percent: progress.percent ?? 0 });
  const remaining = progress.remainingMinor ?? 0;
  const remainingText =
    remaining < 0
      ? `${t('labels.overBy')} ${format.money(-remaining)}`
      : `${t('labels.remaining')} ${format.money(remaining)}`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${spentOf}, ${used}, ${t(`status.${progress.status}`)}`}
      accessibilityHint={t('categories.rowHint')}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <CategoryIcon category={item.category} />
      <View style={styles.body}>
        <View style={styles.line}>
          <AppText variant="bodyMedium" style={styles.flex} numberOfLines={1}>
            {name}
          </AppText>
          <BudgetStatusBadge status={progress.status} />
        </View>
        <AppText variant="caption" color="textSecondary" numberOfLines={1}>
          {spentOf}
        </AppText>
        <BudgetProgressBar percent={progress.percent} status={progress.status} />
        <View style={[styles.line, styles.spread]}>
          <AppText variant="caption" color={STATUS_TONES[progress.status].foreground}>
            {used}
          </AppText>
          <AppText
            variant="caption"
            color={remaining < 0 ? 'expense' : 'textSecondary'}
            numberOfLines={1}>
            {remainingText}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}

/** Expense category with spending but no budget; tap to set one. */
export function UnbudgetedRow({
  item,
  onPress,
}: {
  item: UnbudgetedSpending;
  onPress: () => void;
}) {
  const styles = useStyles();
  const { t } = useTranslation('budgets');
  const nameOf = useCategoryName();
  const format = useFormatters();
  const name = nameOf(item.category);
  const amount = format.money(item.spentMinor);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${amount}, ${t('status.none')}`}
      accessibilityHint={t('unbudgeted.rowHint')}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <CategoryIcon category={item.category} />
      <View style={styles.body}>
        <AppText variant="bodyMedium" numberOfLines={1}>
          {name}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {t('status.none')}
        </AppText>
      </View>
      <AppText variant="bodyMedium" numberOfLines={1} constrainScale>
        {amount}
      </AppText>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    paddingVertical: t.spacing.sm,
    minHeight: t.layout.minTouchTarget,
  },
  body: { flex: 1, gap: t.spacing.xs },
  line: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  flex: { flex: 1 },
  spread: { justifyContent: 'space-between' },
  pressed: { opacity: t.layout.pressedOpacity },
}));
