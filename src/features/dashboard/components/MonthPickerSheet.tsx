import { addYears, getYear, isAfter, isSameMonth, setMonth, startOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppIconButton, AppSheet, AppText } from '@/components/ui';
import { useFormatters } from '@/hooks/useFormatters';
import { makeStyles } from '@/theme';

const MONTH_INDEXES = Array.from({ length: 12 }, (_, i) => i);

export interface MonthPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  value: Date;
  onChange: (month: Date) => void;
  today: Date;
}

/** Year stepper + 12-month grid. Future months are disabled. */
export function MonthPickerSheet({
  visible,
  onClose,
  value,
  onChange,
  today,
}: MonthPickerSheetProps) {
  const styles = useStyles();
  const { t } = useTranslation('dashboard');
  const format = useFormatters();
  const [year, setYear] = useState(getYear(value));
  // Each opening starts at the selected month's year (state reset during render).
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setYear(getYear(value));
  }

  const currentMonth = startOfMonth(today);
  const yearStart = new Date(year, 0, 1);

  return (
    <AppSheet visible={visible} onClose={onClose} title={t('month.pickerTitle')}>
      <View style={styles.yearRow}>
        <AppIconButton
          icon={ChevronLeft}
          onPress={() => setYear((y) => y - 1)}
          accessibilityLabel={t('month.previousYear')}
          mirrorInRTL
        />
        <AppText variant="heading3" align="center" style={styles.year}>
          {year}
        </AppText>
        <AppIconButton
          icon={ChevronRight}
          onPress={() => setYear((y) => y + 1)}
          disabled={isAfter(addYears(yearStart, 1), currentMonth)}
          accessibilityLabel={t('month.nextYear')}
          mirrorInRTL
        />
      </View>
      <View style={styles.grid} accessibilityRole="radiogroup">
        {MONTH_INDEXES.map((index) => {
          const month = setMonth(yearStart, index);
          const disabled = isAfter(month, currentMonth);
          const selected = isSameMonth(month, value);
          return (
            <Pressable
              key={index}
              disabled={disabled}
              onPress={() => {
                onChange(month);
                onClose();
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled }}
              accessibilityLabel={format.monthYear(month)}
              style={({ pressed }) => [
                styles.cell,
                selected && styles.selected,
                disabled && styles.disabled,
                pressed && styles.pressed,
              ]}>
              <AppText
                variant="bodyMedium"
                color={selected ? 'onPrimary' : 'textPrimary'}
                numberOfLines={1}>
                {format.monthShort(month)}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </AppSheet>
  );
}

const useStyles = makeStyles((t) => ({
  yearRow: { flexDirection: 'row', alignItems: 'center' },
  year: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: t.spacing.sm },
  cell: {
    width: '33.333%',
    minHeight: t.layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.radius.md,
  },
  selected: { backgroundColor: t.colors.primary },
  disabled: { opacity: t.layout.disabledOpacity },
  pressed: { opacity: t.layout.pressedOpacity },
}));
