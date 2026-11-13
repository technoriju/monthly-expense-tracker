import { CircleAlert, Square, SquareCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppChip, AppIcon, AppText } from '@/components/ui';
import { useFormatters } from '@/hooks/useFormatters';
import { makeStyles } from '@/theme';

import type { ReceiptItemDraft, TotalCandidate } from '../types';
import type { ReceiptIssue } from '../validation/receiptValidation';

export interface ReceiptIssuesCardProps {
  issues: ReceiptIssue[];
  items: ReceiptItemDraft[];
  totalCandidates: TotalCandidate[];
  onChooseTotal: (amountMinor: number) => void;
  mustConfirm: boolean;
  confirmed: boolean;
  onConfirmedChange: (value: boolean) => void;
  confirmMissing: boolean;
}

/**
 * Everything that does not add up, in plain words. Amounts are never changed for the user:
 * they choose a total, edit a row, or tick "I've checked the amount" to save as is.
 */
export function ReceiptIssuesCard({
  issues,
  items,
  totalCandidates,
  onChooseTotal,
  mustConfirm,
  confirmed,
  onConfirmedChange,
  confirmMissing,
}: ReceiptIssuesCardProps) {
  const styles = useStyles();
  const { t } = useTranslation('receipts');
  const format = useFormatters();
  const shown = issues.filter((i) => i.severity !== 'blocking');
  if (shown.length === 0) return null;

  const nameOf = (key: string) =>
    items.find((i) => i.key === key)?.name ?? t('review.items.unnamed');
  const message = (issue: ReceiptIssue): string => {
    switch (issue.code) {
      case 'itemAmountUncertain':
      case 'itemSuspicious':
        return t(`review.issues.${issue.code}`, { name: nameOf(issue.itemKey) });
      case 'itemQuantityMismatch':
        return t('review.issues.itemQuantityMismatch', {
          name: nameOf(issue.itemKey),
          expected: format.money(issue.expectedMinor),
        });
      case 'itemsVsSubtotal':
        return t('review.issues.itemsVsSubtotal', {
          items: format.money(issue.itemsMinor),
          subtotal: format.money(issue.subtotalMinor),
        });
      case 'totalsMismatch':
        return t('review.issues.totalsMismatch', { expected: format.money(issue.expectedMinor) });
      case 'finalVsItems':
        return t('review.issues.finalVsItems', { items: format.money(issue.itemsMinor) });
      case 'finalVsExtracted':
        return t('review.issues.finalVsExtracted', { amount: format.money(issue.extractedMinor) });
      case 'totalAmbiguous':
      case 'totalMissing':
        return t(`review.issues.${issue.code}`);
      default:
        return '';
    }
  };
  const candidates = [...new Set(totalCandidates.map((c) => c.amountMinor))];
  const itemsTotal = shown.find((i) => i.code === 'finalVsItems');

  return (
    <View style={styles.card} accessibilityRole="alert">
      <View style={styles.title}>
        <AppIcon icon={CircleAlert} color="accentText" size="sm" />
        <AppText variant="bodyMedium" color="accentText">
          {t('review.issues.title')}
        </AppText>
      </View>
      {shown.map((issue, index) => (
        <AppText key={`${issue.code}-${index}`} variant="bodySmall">
          {`• ${message(issue)}`}
        </AppText>
      ))}
      {shown.some((i) => i.code === 'totalAmbiguous') && candidates.length > 1 ? (
        <View style={styles.chips}>
          <AppText variant="bodySmall" color="textSecondary">
            {t('review.totals.chooseTotal')}
          </AppText>
          <View style={styles.chipRow}>
            {candidates.map((amount) => (
              <AppChip
                key={amount}
                label={format.money(amount)}
                role="button"
                onPress={() => onChooseTotal(amount)}
              />
            ))}
          </View>
        </View>
      ) : null}
      {itemsTotal && itemsTotal.code === 'finalVsItems' ? (
        <View style={styles.chipRow}>
          <AppChip
            label={t('review.totals.useItems', { amount: format.money(itemsTotal.itemsMinor) })}
            role="button"
            onPress={() => onChooseTotal(itemsTotal.itemsMinor)}
          />
        </View>
      ) : null}
      {mustConfirm ? (
        <Pressable
          onPress={() => onConfirmedChange(!confirmed)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: confirmed }}
          style={styles.check}>
          <AppIcon icon={confirmed ? SquareCheck : Square} color="primary" />
          <AppText variant="bodyMedium" style={styles.flex}>
            {t('review.confirmCheck')}
          </AppText>
        </Pressable>
      ) : null}
      {confirmMissing ? (
        <AppText variant="bodySmall" color="expenseText" accessibilityRole="alert">
          {t('review.confirmRequired')}
        </AppText>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    gap: t.spacing.sm,
    padding: t.spacing.lg,
    borderRadius: t.radius.lg,
    backgroundColor: t.colors.accentSoft,
  },
  title: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs },
  chips: { gap: t.spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
  check: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    minHeight: t.layout.minTouchTarget,
  },
  flex: { flex: 1 },
}));
