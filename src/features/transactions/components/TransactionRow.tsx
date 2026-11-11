import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon';
import { useFormatters } from '@/hooks/useFormatters';
import { makeStyles } from '@/theme';
import { getRelativeDayKey } from '@/utils/dates';

import type { TransactionPreview } from '../types';

export function TransactionRow({
  transaction,
  today,
}: {
  transaction: TransactionPreview;
  today: Date;
}) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { t: tCategory } = useTranslation('categories');
  const format = useFormatters();

  const { type, amountMinor, categoryKey, occurredOn } = transaction;
  const title = tCategory(categoryKey);
  const relative = getRelativeDayKey(occurredOn, today);
  const dateLabel = relative ? t(`date.${relative}`) : format.shortDate(occurredOn);
  const signedAmount = type === 'expense' ? -amountMinor : amountMinor;
  const amountLabel = format.money(signedAmount, 'exceptZero');

  return (
    <View
      style={styles.root}
      accessible
      accessibilityLabel={`${title}, ${dateLabel}, ${amountLabel}`}>
      <CategoryIcon categoryKey={categoryKey} />
      <View style={styles.text}>
        <AppText variant="bodyMedium" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="bodySmall" color="textSecondary" numberOfLines={1}>
          {dateLabel}
        </AppText>
      </View>
      <AppText
        variant="bodyMedium"
        color={type === 'expense' ? 'expense' : 'income'}
        constrainScale>
        {amountLabel}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    paddingVertical: t.spacing.sm,
  },
  text: { flex: 1 },
}));
