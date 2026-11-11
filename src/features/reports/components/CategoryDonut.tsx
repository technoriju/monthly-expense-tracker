import { useTranslation } from 'react-i18next';

import { DonutChart } from '@/components/charts/DonutChart';
import { AppText } from '@/components/ui';
import { useCategoryName } from '@/features/categories/hooks/useCategoryName';
import { useFormatters } from '@/hooks/useFormatters';
import { useTheme } from '@/theme';
import type { MinorAmount, TransactionType } from '@/types/money';

import { donutSlices } from '../chartColors';
import type { CategoryShare } from '../types';

export interface CategoryDonutProps {
  type: TransactionType;
  shares: readonly CategoryShare[];
  totalMinor: MinorAmount;
  size?: 'regular' | 'large';
}

/** Donut of category shares with the period total in the middle. */
export function CategoryDonut({ type, shares, totalMinor, size = 'regular' }: CategoryDonutProps) {
  const { t } = useTranslation('reports');
  const { colors } = useTheme();
  const nameOf = useCategoryName();
  const format = useFormatters();
  const total = format.money(totalMinor);
  const totalLabel = type === 'expense' ? t('breakdown.totalExpense') : t('breakdown.totalIncome');
  const a11y = t('breakdown.chartLabel', {
    type: t(`breakdown.${type}`),
    slices: shares.map((s) => `${nameOf(s.category)} ${s.percent}%`).join(', '),
  });

  return (
    <DonutChart slices={donutSlices(shares, colors)} size={size} accessibilityLabel={a11y}>
      <AppText
        variant={size === 'large' ? 'heading2' : 'bodyMedium'}
        align="center"
        numberOfLines={1}
        adjustsFontSizeToFit
        constrainScale>
        {total}
      </AppText>
      <AppText variant="caption" color="textSecondary" align="center" numberOfLines={2}>
        {totalLabel}
      </AppText>
    </DonutChart>
  );
}
