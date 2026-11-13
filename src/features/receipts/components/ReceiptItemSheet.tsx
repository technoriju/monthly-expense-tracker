import { Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppButton, AppInput, AppSheet, AppText } from '@/components/ui';
import { useSettingsStore } from '@/store/settingsStore';
import { makeStyles } from '@/theme';
import { getCurrencyInfo } from '@/utils/money';

import { amountToInput, parseOptionalAmount, parseQuantityMilli, quantityToInput } from '../format';
import { RECEIPT_TEXT_MAX_LENGTH } from '../schemas';
import type { ReceiptItemDraft } from '../types';

export interface ReceiptItemSheetProps {
  /** Item being edited, or a new blank item. */
  item: ReceiptItemDraft;
  isNew: boolean;
  onClose: () => void;
  onSave: (item: ReceiptItemDraft) => void;
  onDelete: () => void;
}

/**
 * Edit one item. Every field is optional — an item may keep no name (unreadable handwriting)
 * or no amount. Saving marks the row as checked by the user.
 */
export function ReceiptItemSheet({
  item,
  isNew,
  onClose,
  onSave,
  onDelete,
}: ReceiptItemSheetProps) {
  const styles = useStyles();
  const { t } = useTranslation('receipts');
  const currency = useSettingsStore((s) => s.currency);
  const symbol = getCurrencyInfo(currency).symbol;
  const [name, setName] = useState(item.name ?? '');
  const [quantity, setQuantity] = useState(
    item.quantityMilli === null ? '' : quantityToInput(item.quantityMilli),
  );
  const [unit, setUnit] = useState(item.unit ?? '');
  const [unitPrice, setUnitPrice] = useState(amountToInput(item.unitPriceMinor, currency));
  const [lineTotal, setLineTotal] = useState(amountToInput(item.lineTotalMinor, currency));
  const [showErrors, setShowErrors] = useState(false);

  const quantityMilli = quantity.trim() === '' ? null : parseQuantityMilli(quantity);
  const unitPriceMinor = parseOptionalAmount(unitPrice, currency);
  const lineTotalMinor = parseOptionalAmount(lineTotal, currency);
  const quantityError = quantity.trim() !== '' && quantityMilli === null;

  const done = () => {
    if (quantityError || unitPriceMinor === undefined || lineTotalMinor === undefined) {
      setShowErrors(true);
      return;
    }
    onSave({
      ...item,
      name: name.trim() === '' ? null : name.trim(),
      quantityMilli,
      unit: unit.trim() === '' ? null : unit.trim(),
      unitPriceMinor,
      lineTotalMinor,
      userCorrected: true,
    });
  };

  return (
    <AppSheet
      visible
      onClose={onClose}
      title={isNew ? t('item.addTitle') : t('item.editTitle')}
      footer={
        <View style={styles.footer}>
          <AppButton label={t('item.done')} onPress={done} fullWidth />
          {!isNew ? (
            <AppButton
              label={t('item.delete')}
              variant="danger"
              icon={Trash2}
              onPress={onDelete}
              fullWidth
            />
          ) : null}
        </View>
      }>
      <View style={styles.body}>
        <AppInput
          label={t('item.name')}
          value={name}
          onChangeText={setName}
          placeholder={t('review.optional')}
          maxLength={RECEIPT_TEXT_MAX_LENGTH}
          helperText={
            item.originalOcrName && item.originalOcrName !== name
              ? t('item.readAs', { text: item.originalOcrName })
              : undefined
          }
        />
        <View style={styles.row}>
          <View style={styles.flex}>
            <AppInput
              label={t('item.quantity')}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
              error={showErrors && quantityError ? t('item.invalidQuantity') : undefined}
            />
          </View>
          <View style={styles.flex}>
            <AppInput label={t('item.unit')} value={unit} onChangeText={setUnit} maxLength={16} />
          </View>
        </View>
        <AppInput
          label={t('item.unitPrice')}
          value={unitPrice}
          onChangeText={setUnitPrice}
          keyboardType="decimal-pad"
          prefix={<AppText color="textSecondary">{symbol}</AppText>}
          error={showErrors && unitPriceMinor === undefined ? t('item.invalidAmount') : undefined}
        />
        <AppInput
          label={t('item.lineTotal')}
          value={lineTotal}
          onChangeText={setLineTotal}
          keyboardType="decimal-pad"
          prefix={<AppText color="textSecondary">{symbol}</AppText>}
          error={showErrors && lineTotalMinor === undefined ? t('item.invalidAmount') : undefined}
        />
      </View>
    </AppSheet>
  );
}

const useStyles = makeStyles((t) => ({
  body: { gap: t.spacing.md },
  row: { flexDirection: 'row', gap: t.spacing.md },
  flex: { flex: 1 },
  footer: { gap: t.spacing.sm },
}));
