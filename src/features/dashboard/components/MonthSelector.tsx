import { CalendarDays, ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppIcon, AppText } from '@/components/ui';
import { useFormatters } from '@/hooks/useFormatters';
import { makeStyles } from '@/theme';

import { MonthPickerSheet } from './MonthPickerSheet';

export interface MonthSelectorProps {
  month: Date;
  onChange: (month: Date) => void;
  today: Date;
}

/** Month pill + calendar badge (design-reference Dashboard). Both open the month picker. */
export function MonthSelector({ month, onChange, today }: MonthSelectorProps) {
  const styles = useStyles();
  const { t } = useTranslation('dashboard');
  const format = useFormatters();
  const [open, setOpen] = useState(false);
  const label = format.monthYear(month);

  return (
    <View style={styles.root}>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('month.selectorLabel', { month: label })}
        style={({ pressed }) => [styles.pill, pressed && styles.pressed]}>
        <AppText variant="bodyMedium" numberOfLines={1}>
          {label}
        </AppText>
        <AppIcon icon={ChevronDown} size="sm" color="textSecondary" />
      </Pressable>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('month.calendarLabel')}
        style={({ pressed }) => [styles.calendar, pressed && styles.pressed]}>
        <AppIcon icon={CalendarDays} size="md" color="textSecondary" />
      </Pressable>
      <MonthPickerSheet
        visible={open}
        onClose={() => setOpen(false)}
        value={month}
        onChange={onChange}
        today={today}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: t.spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surface,
    borderWidth: t.layout.borderWidth,
    borderColor: t.colors.border,
  },
  calendar: {
    padding: t.spacing.sm,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surface,
    borderWidth: t.layout.borderWidth,
    borderColor: t.colors.border,
  },
  pressed: { opacity: t.layout.pressedOpacity },
}));
