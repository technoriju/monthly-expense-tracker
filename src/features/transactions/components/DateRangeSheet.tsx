import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppButton, AppSheet } from '@/components/ui';
import type { IsoDate } from '@/utils/dates';

import { DateField } from './DateField';

export interface DateRange {
  from: IsoDate | null;
  to: IsoDate | null;
}

export interface DateRangeSheetProps {
  visible: boolean;
  onClose: () => void;
  value: DateRange;
  onApply: (range: DateRange) => void;
}

/** Picks an inclusive date range; either end may be left open. Reversed ends are swapped. */
export function DateRangeSheet({ visible, onClose, value, onApply }: DateRangeSheetProps) {
  const { t } = useTranslation('transactions');
  const [draft, setDraft] = useState<DateRange>(value);
  // Start each opening from the applied range (state reset during render, not in an effect).
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setDraft(value);
  }

  const apply = () => {
    const { from, to } = draft;
    onApply(from && to && from > to ? { from: to, to: from } : draft);
    onClose();
  };

  return (
    <AppSheet
      visible={visible}
      onClose={onClose}
      title={t('history.dateRange')}
      footer={
        <>
          <AppButton label={t('history.apply')} onPress={apply} fullWidth />
          <AppButton
            label={t('history.clearFilters')}
            variant="ghost"
            onPress={() => {
              onApply({ from: null, to: null });
              onClose();
            }}
            fullWidth
          />
        </>
      }>
      <DateField
        label={t('history.from')}
        value={draft.from}
        placeholder={t('history.anyDate')}
        onChange={(from) => setDraft((d) => ({ ...d, from }))}
      />
      <DateField
        label={t('history.to')}
        value={draft.to}
        placeholder={t('history.anyDate')}
        onChange={(to) => setDraft((d) => ({ ...d, to }))}
      />
    </AppSheet>
  );
}
