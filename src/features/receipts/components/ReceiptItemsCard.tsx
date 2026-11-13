import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppButton, AppCard, AppText } from '@/components/ui';
import { makeStyles } from '@/theme';

import type { ReceiptItemDraft } from '../types';
import { ReceiptItemRow } from './ReceiptItemRow';
import { ReceiptItemSheet } from './ReceiptItemSheet';

/** Rows shown before "Show all", so long receipts do not overload the screen. */
const COLLAPSED_ROWS = 5;

let nextKey = 1;
const blankItem = (): ReceiptItemDraft => ({
  key: `new-${Date.now()}-${nextKey++}`,
  name: null,
  originalOcrName: null,
  quantityMilli: null,
  unit: null,
  unitPriceMinor: null,
  lineTotalMinor: null,
  nameConfidence: null,
  amountConfidence: null,
  flags: [],
  userCorrected: true,
});

/** Item list with add / edit / delete. Read-only when `onChange` is omitted. */
export function ReceiptItemsCard({
  items,
  onChange,
}: {
  items: ReceiptItemDraft[];
  onChange?: (items: ReceiptItemDraft[]) => void;
}) {
  const styles = useStyles();
  const { t } = useTranslation('receipts');
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState<{ item: ReceiptItemDraft; isNew: boolean } | null>(null);

  const visible = expanded ? items : items.slice(0, COLLAPSED_ROWS);
  const editable = onChange !== undefined;

  const save = (item: ReceiptItemDraft) => {
    if (!onChange) return;
    const exists = items.some((i) => i.key === item.key);
    onChange(exists ? items.map((i) => (i.key === item.key ? item : i)) : [...items, item]);
    setEditing(null);
  };
  const remove = (key: string) => {
    onChange?.(items.filter((i) => i.key !== key));
    setEditing(null);
  };

  if (items.length === 0 && !editable) return null;

  return (
    <AppCard style={styles.card}>
      <AppText variant="heading3" accessibilityRole="header">
        {t('review.items.title')}
      </AppText>
      {visible.map((item) => (
        <ReceiptItemRow
          key={item.key}
          item={item}
          onPress={editable ? () => setEditing({ item, isNew: false }) : undefined}
        />
      ))}
      {items.length > COLLAPSED_ROWS ? (
        <AppButton
          label={
            expanded
              ? t('review.items.showLess')
              : t('review.items.showAll', { count: items.length })
          }
          variant="ghost"
          size="sm"
          onPress={() => setExpanded((v) => !v)}
        />
      ) : null}
      {editable ? (
        <View style={styles.add}>
          <AppButton
            label={t('review.items.add')}
            icon={Plus}
            variant="secondary"
            size="sm"
            onPress={() => setEditing({ item: blankItem(), isNew: true })}
          />
        </View>
      ) : null}
      {editing ? (
        <ReceiptItemSheet
          item={editing.item}
          isNew={editing.isNew}
          onClose={() => setEditing(null)}
          onSave={save}
          onDelete={() => remove(editing.item.key)}
        />
      ) : null}
    </AppCard>
  );
}

const useStyles = makeStyles((t) => ({
  card: { gap: t.spacing.xs },
  add: { alignItems: 'flex-start', paddingTop: t.spacing.sm },
}));
