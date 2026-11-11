import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui';
import { CategoryIcon } from '@/features/categories/components/CategoryIcon';
import { useCategoryName } from '@/features/categories/hooks/useCategoryName';
import { useFormatters } from '@/hooks/useFormatters';
import { makeStyles } from '@/theme';
import { getRelativeDayKey } from '@/utils/dates';

import type { Transaction } from '../types';

export interface TransactionRowProps {
  transaction: Transaction;
  today: Date;
  /** Hide the date when rows are already grouped under a date header. */
  showDate?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function TransactionRow({
  transaction,
  today,
  showDate = true,
  onPress,
  onLongPress,
}: TransactionRowProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { t: tTx } = useTranslation('transactions');
  const nameOf = useCategoryName();
  const format = useFormatters();

  const { type, amountMinor, category, occurredOn, note } = transaction;
  const title = nameOf(category);
  const relative = getRelativeDayKey(occurredOn, today);
  const dateLabel = relative ? t(`date.${relative}`) : format.shortDate(occurredOn);
  const subtitle = [showDate ? dateLabel : null, note].filter(Boolean).join(' · ');
  const signedAmount = type === 'expense' ? -amountMinor : amountMinor;
  const amountLabel = format.money(signedAmount, 'exceptZero');

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress && !onLongPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityHint={onPress ? tTx('row.editHint') : undefined}
      accessibilityLabel={[title, subtitle, amountLabel].filter(Boolean).join(', ')}
      style={({ pressed }) => [styles.root, pressed && styles.pressed]}>
      <CategoryIcon category={category} />
      <View style={styles.text}>
        <AppText variant="bodyMedium" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="bodySmall" color="textSecondary" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <AppText
        variant="bodyMedium"
        color={type === 'expense' ? 'expense' : 'income'}
        constrainScale>
        {amountLabel}
      </AppText>
    </Pressable>
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
  pressed: { opacity: t.layout.pressedOpacity },
}));
