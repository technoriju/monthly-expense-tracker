import { Pencil } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppButton, AppCard, AppInput, AppSheet, AppText } from '@/components/ui';
import { useFormatters } from '@/hooks/useFormatters';
import { useSettingsStore } from '@/store/settingsStore';
import { makeStyles } from '@/theme';
import type { MinorAmount } from '@/types/money';

import { amountToInput, parseOptionalAmount } from '../format';

export interface ReceiptTotals {
  subtotalMinor: MinorAmount | null;
  taxMinor: MinorAmount | null;
  discountMinor: MinorAmount | null;
  chargesMinor: MinorAmount | null;
  roundOffMinor: MinorAmount | null;
}

const FIELDS = [
  ['subtotalMinor', 'subtotal'],
  ['taxMinor', 'tax'],
  ['discountMinor', 'discount'],
  ['chargesMinor', 'charges'],
  ['roundOffMinor', 'roundOff'],
] as const;

/** Subtotal, tax, discount, charges and round-off as read; editable in a sheet when `onChange` is set. */
export function ReceiptTotalsCard({
  totals,
  onChange,
}: {
  totals: ReceiptTotals;
  onChange?: (totals: ReceiptTotals) => void;
}) {
  const styles = useStyles();
  const { t } = useTranslation('receipts');
  const format = useFormatters();
  const [editing, setEditing] = useState(false);
  const shown = FIELDS.filter(([field]) => totals[field] !== null);

  return (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <AppText variant="heading3" accessibilityRole="header" style={styles.flex}>
          {t('review.totals.title')}
        </AppText>
        {onChange ? (
          <AppButton
            label={t('review.totals.edit')}
            icon={Pencil}
            variant="ghost"
            size="sm"
            onPress={() => setEditing(true)}
          />
        ) : null}
      </View>
      {shown.length === 0 ? (
        <AppText variant="bodySmall" color="textSecondary">
          {t('review.totals.none')}
        </AppText>
      ) : (
        shown.map(([field, label]) => (
          <View key={field} style={styles.row}>
            <AppText variant="body" color="textSecondary" style={styles.flex}>
              {t(`review.totals.${label}`)}
            </AppText>
            <AppText variant="bodyMedium" constrainScale>
              {format.money(
                field === 'discountMinor' ? -(totals[field] ?? 0) : (totals[field] ?? 0),
                field === 'discountMinor' || field === 'roundOffMinor' ? 'exceptZero' : undefined,
              )}
            </AppText>
          </View>
        ))
      )}
      {editing && onChange ? (
        <TotalsSheet
          totals={totals}
          onClose={() => setEditing(false)}
          onSave={(next) => {
            onChange(next);
            setEditing(false);
          }}
        />
      ) : null}
    </AppCard>
  );
}

function TotalsSheet({
  totals,
  onClose,
  onSave,
}: {
  totals: ReceiptTotals;
  onClose: () => void;
  onSave: (totals: ReceiptTotals) => void;
}) {
  const styles = useStyles();
  const { t } = useTranslation('receipts');
  const currency = useSettingsStore((s) => s.currency);
  const [values, setValues] = useState(() =>
    Object.fromEntries(FIELDS.map(([field]) => [field, amountToInput(totals[field], currency)])),
  );
  const [showErrors, setShowErrors] = useState(false);
  const parsed = Object.fromEntries(
    FIELDS.map(([field]) => [
      field,
      parseOptionalAmount(values[field] ?? '', currency, {
        allowNegative: field === 'roundOffMinor',
      }),
    ]),
  ) as Record<keyof ReceiptTotals, MinorAmount | null | undefined>;
  const invalid = FIELDS.some(([field]) => parsed[field] === undefined);

  const done = () => {
    if (invalid) {
      setShowErrors(true);
      return;
    }
    onSave(parsed as ReceiptTotals);
  };

  return (
    <AppSheet
      visible
      onClose={onClose}
      title={t('review.totals.title')}
      footer={<AppButton label={t('item.done')} onPress={done} fullWidth />}>
      <View style={styles.sheet}>
        {FIELDS.map(([field, label]) => (
          <AppInput
            key={field}
            label={t(`review.totals.${label}`)}
            value={values[field] ?? ''}
            onChangeText={(text) => setValues((v) => ({ ...v, [field]: text }))}
            keyboardType={field === 'roundOffMinor' ? 'numbers-and-punctuation' : 'decimal-pad'}
            placeholder={t('review.optional')}
            error={showErrors && parsed[field] === undefined ? t('item.invalidAmount') : undefined}
          />
        ))}
      </View>
    </AppSheet>
  );
}

const useStyles = makeStyles((t) => ({
  card: { gap: t.spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  sheet: { gap: t.spacing.md },
}));
