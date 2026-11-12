import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppButton, AppSheet, AppText } from '@/components/ui';
import { DateField } from '@/features/transactions/components/DateField';
import type { DateRange, IsoDate } from '@/utils/dates';

import { validateCustomRange } from '../period';

export interface CustomRangeSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Range to start from when the sheet opens. */
  initial: DateRange;
  onApply: (range: DateRange) => void;
}

/** Picks an inclusive custom report range; both ends required, end on/after start. */
export function CustomRangeSheet({ visible, onClose, initial, onApply }: CustomRangeSheetProps) {
  const { t } = useTranslation('reports');
  const [from, setFrom] = useState<IsoDate | null>(initial.from);
  const [to, setTo] = useState<IsoDate | null>(initial.to);
  const [submitted, setSubmitted] = useState(false);
  // Start each opening from the current range (state reset during render, not in an effect).
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setFrom(initial.from);
      setTo(initial.to);
      setSubmitted(false);
    }
  }

  const error = validateCustomRange(from, to);

  const apply = () => {
    setSubmitted(true);
    if (error || !from || !to) return;
    onApply({ from, to });
    onClose();
  };

  return (
    <AppSheet
      visible={visible}
      onClose={onClose}
      title={t('period.custom.title')}
      footer={<AppButton label={t('period.custom.apply')} onPress={apply} fullWidth />}>
      <DateField
        label={t('period.custom.from')}
        value={from}
        placeholder={t('period.custom.choose')}
        onChange={setFrom}
      />
      <DateField
        label={t('period.custom.to')}
        value={to}
        placeholder={t('period.custom.choose')}
        onChange={setTo}
        minimumDate={from ?? undefined}
      />
      {submitted && error ? (
        <AppText variant="bodySmall" color="expenseText" accessibilityRole="alert">
          {t(`period.custom.errors.${error}`)}
        </AppText>
      ) : null}
    </AppSheet>
  );
}
