import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText, type TextColorToken } from '@/components/ui';
import { makeStyles, useTheme } from '@/theme';

import type { BudgetStatus } from '../types';

/** Text / soft background / bar color tokens per status. */
export const STATUS_TONES: Record<
  BudgetStatus,
  { foreground: TextColorToken; background: TextColorToken; bar: TextColorToken }
> = {
  none: { foreground: 'textSecondary', background: 'primarySoft', bar: 'primary' },
  within: { foreground: 'income', background: 'incomeSoft', bar: 'primary' },
  approaching: { foreground: 'accent', background: 'accentSoft', bar: 'accent' },
  exceeded: { foreground: 'expense', background: 'expenseSoft', bar: 'expense' },
};

/** Track + fill; the fill is clamped to 100% even when spending exceeds the budget. */
export function BudgetProgressBar({
  percent,
  status,
}: {
  percent: number | null;
  status: BudgetStatus;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const width = Math.max(0, Math.min(percent ?? 0, 100));
  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: width }}>
      <View
        style={[
          styles.bar,
          { width: `${width}%`, backgroundColor: colors[STATUS_TONES[status].bar] },
        ]}
      />
    </View>
  );
}

/** Small pill naming the budget status. */
export function BudgetStatusBadge({ status }: { status: BudgetStatus }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { t } = useTranslation('budgets');
  const tone = STATUS_TONES[status];
  return (
    <View style={[styles.badge, { backgroundColor: colors[tone.background] }]}>
      <AppText variant="caption" color={tone.foreground} numberOfLines={1}>
        {t(`status.${status}`)}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  track: {
    height: t.layout.progressBarHeight,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.primarySoft,
    overflow: 'hidden',
  },
  bar: { height: '100%', borderRadius: t.radius.pill },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xs,
    borderRadius: t.radius.pill,
  },
}));
