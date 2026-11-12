import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { CalendarDays } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, View } from 'react-native';

import { AppButton, AppIcon, AppSheet, AppText } from '@/components/ui';
import { useActiveLanguage } from '@/hooks/useActiveLanguage';
import { useFormatters } from '@/hooks/useFormatters';
import { makeStyles, useTheme } from '@/theme';
import { fromIsoDate, toIsoDate, type IsoDate } from '@/utils/dates';

export interface DateFieldProps {
  /** Already-translated label. */
  label: string;
  value: IsoDate | null;
  onChange: (value: IsoDate) => void;
  /** Shown when `value` is null. */
  placeholder?: string;
  error?: string;
  minimumDate?: IsoDate;
  maximumDate?: IsoDate;
}

/**
 * Read-only field that opens the native date picker: Android system dialog,
 * iOS inline calendar inside a bottom sheet.
 */
export function DateField({
  label,
  value,
  onChange,
  placeholder,
  error,
  minimumDate,
  maximumDate,
}: DateFieldProps) {
  const styles = useStyles();
  const { t } = useTranslation('transactions');
  const { colors, scheme } = useTheme();
  const format = useFormatters();
  const language = useActiveLanguage();
  const [iosOpen, setIosOpen] = useState(false);
  const [iosDraft, setIosDraft] = useState<Date>(new Date());

  const current = value ? fromIsoDate(value) : new Date();
  const min = minimumDate ? fromIsoDate(minimumDate) : undefined;
  const max = maximumDate ? fromIsoDate(maximumDate) : undefined;
  const display = value ? format.longDate(value) : (placeholder ?? '');

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        minimumDate: min,
        maximumDate: max,
        onValueChange: (_event, date) => onChange(toIsoDate(date)),
      });
    } else {
      setIosDraft(current);
      setIosOpen(true);
    }
  };

  return (
    <View style={styles.root}>
      <AppText variant="bodyMedium">{label}</AppText>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${display}`}
        accessibilityHint={error ?? t('fields.dateHint')}
        style={({ pressed }) => [
          styles.field,
          error ? styles.errored : null,
          pressed && styles.pressed,
        ]}>
        <AppText
          variant="body"
          color={value ? 'textPrimary' : 'textMuted'}
          style={styles.value}
          numberOfLines={1}>
          {display}
        </AppText>
        <AppIcon icon={CalendarDays} size="md" color="textSecondary" />
      </Pressable>
      {error ? (
        <AppText variant="bodySmall" color="expenseText" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}

      {Platform.OS === 'ios' ? (
        <AppSheet
          visible={iosOpen}
          onClose={() => setIosOpen(false)}
          title={label}
          footer={
            <AppButton
              label={t('history.apply')}
              onPress={() => {
                onChange(toIsoDate(iosDraft));
                setIosOpen(false);
              }}
              fullWidth
            />
          }>
          <DateTimePicker
            value={iosDraft}
            mode="date"
            display="inline"
            locale={language.locale}
            accentColor={colors.primary}
            themeVariant={scheme}
            minimumDate={min}
            maximumDate={max}
            onValueChange={(_event, date) => setIosDraft(date)}
          />
        </AppSheet>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: t.spacing.sm },
  field: {
    minHeight: t.layout.inputHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
    borderRadius: t.radius.md,
    borderWidth: t.layout.borderWidth,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  value: { flex: 1 },
  errored: { borderColor: t.colors.expense },
  pressed: { opacity: t.layout.pressedOpacity },
}));
