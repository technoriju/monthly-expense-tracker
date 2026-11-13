import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useFormatters } from '@/hooks/useFormatters';
import { makeStyles } from '@/theme';

import { quantityToInput } from '../format';
import type { ReceiptItemDraft } from '../types';

/** One receipt item: name (or "Unreadable item"), qty × price, amount, uncertainty badges. */
export function ReceiptItemRow({
  item,
  onPress,
}: {
  item: ReceiptItemDraft;
  onPress?: () => void;
}) {
  const styles = useStyles();
  const { t } = useTranslation('receipts');
  const format = useFormatters();
  const name = item.name ?? t('review.items.unnamed');
  const detail =
    item.quantityMilli !== null
      ? [
          `${quantityToInput(item.quantityMilli)}${item.unit ? ` ${item.unit}` : ''}`,
          item.unitPriceMinor !== null ? format.money(item.unitPriceMinor) : null,
        ]
          .filter(Boolean)
          .join(' × ')
      : null;
  const amount =
    item.lineTotalMinor !== null ? format.money(item.lineTotalMinor) : t('review.items.noAmount');
  const flags = item.userCorrected ? [] : item.flags;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityHint={onPress ? t('review.items.editHint') : undefined}
      accessibilityLabel={[name, detail, amount, ...flags.map((f) => t(`review.items.flags.${f}`))]
        .filter(Boolean)
        .join(', ')}
      style={({ pressed }) => [styles.root, pressed && styles.pressed]}>
      <View style={styles.text}>
        <AppText
          variant="bodyMedium"
          color={item.name === null ? 'textSecondary' : 'textPrimary'}
          numberOfLines={2}>
          {name}
        </AppText>
        {detail ? (
          <AppText variant="bodySmall" color="textSecondary">
            {detail}
          </AppText>
        ) : null}
        {flags.length > 0 ? (
          <View style={styles.badges}>
            {flags.map((flag) => (
              <View key={flag} style={styles.badge}>
                <AppText variant="caption" color="accentText">
                  {t(`review.items.flags.${flag}`)}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      <AppText
        variant="bodyMedium"
        color={item.lineTotalMinor === null ? 'textSecondary' : 'textPrimary'}
        constrainScale>
        {amount}
      </AppText>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: t.spacing.md,
    paddingVertical: t.spacing.sm,
    minHeight: t.layout.minTouchTarget,
  },
  pressed: { opacity: t.layout.pressedOpacity },
  text: { flex: 1, gap: t.spacing.xs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.xs },
  badge: {
    backgroundColor: t.colors.accentSoft,
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xs / 2,
  },
}));
