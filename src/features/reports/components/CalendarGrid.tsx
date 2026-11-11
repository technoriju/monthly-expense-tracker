import { addDays, startOfWeek } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useFormatters } from '@/hooks/useFormatters';
import { makeStyles } from '@/theme';
import type { IsoDate } from '@/utils/dates';

import type { CalendarDay } from '../types';

const WEEK = 7;

export interface CalendarGridProps {
  days: readonly CalendarDay[];
  selectedDate: IsoDate;
  onSelect: (date: IsoDate) => void;
}

/**
 * Sunday-first month grid (design-reference Monthly Calendar). Cells stay light: day number
 * plus a green/red dot when the day has income/expenses; amounts live in the day summary.
 */
export function CalendarGrid({ days, selectedDate, onSelect }: CalendarGridProps) {
  const styles = useStyles();
  const { t } = useTranslation('reports');
  const format = useFormatters();
  const sunday = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < days.length; i += WEEK) weeks.push(days.slice(i, i + WEEK));

  return (
    <View style={styles.root}>
      <View style={styles.week} importantForAccessibility="no-hide-descendants">
        {Array.from({ length: WEEK }, (_, i) => (
          <AppText
            key={i}
            variant="caption"
            color="textSecondary"
            align="center"
            numberOfLines={1}
            style={styles.cell}>
            {format.weekdayShort(addDays(sunday, i))}
          </AppText>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0]?.date} style={styles.week}>
          {week.map((day) => {
            const selected = day.date === selectedDate;
            const hasIncome = day.incomeMinor > 0;
            const hasExpense = day.expenseMinor > 0;
            const dateLabel = format.longDate(day.date);
            const summary =
              day.count > 0
                ? t('calendar.dayLabel', {
                    date: dateLabel,
                    income: format.money(day.incomeMinor),
                    expense: format.money(day.expenseMinor),
                  })
                : t('calendar.dayLabelEmpty', { date: dateLabel });
            return (
              <Pressable
                key={day.date}
                onPress={() => onSelect(day.date)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={
                  day.isToday ? t('calendar.todayLabel', { label: summary }) : summary
                }
                style={({ pressed }) => [styles.cell, styles.dayCell, pressed && styles.pressed]}>
                <View
                  style={[
                    styles.dayCircle,
                    day.isToday && !selected && styles.today,
                    selected && styles.selected,
                  ]}>
                  <AppText
                    variant="bodySmall"
                    color={selected ? 'onPrimary' : day.inMonth ? 'textPrimary' : 'textMuted'}
                    constrainScale>
                    {format.dayOfMonth(day.date)}
                  </AppText>
                </View>
                <View style={styles.dots}>
                  {hasIncome ? <View style={[styles.dot, styles.incomeDot]} /> : null}
                  {hasExpense ? <View style={[styles.dot, styles.expenseDot]} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: t.spacing.xs },
  week: { flexDirection: 'row' },
  cell: { flex: 1 },
  dayCell: {
    height: t.layout.calendarCellHeight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.xs,
  },
  dayCircle: {
    width: t.layout.calendarDaySize,
    height: t.layout.calendarDaySize,
    borderRadius: t.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  today: { borderWidth: t.layout.borderWidth, borderColor: t.colors.primary },
  selected: { backgroundColor: t.colors.primary },
  dots: {
    flexDirection: 'row',
    gap: t.spacing.xs,
    height: t.layout.calendarDotSize,
  },
  dot: {
    width: t.layout.calendarDotSize,
    height: t.layout.calendarDotSize,
    borderRadius: t.radius.pill,
  },
  incomeDot: { backgroundColor: t.colors.income },
  expenseDot: { backgroundColor: t.colors.expense },
  pressed: { opacity: t.layout.pressedOpacity },
}));
