import { addMonths, startOfMonth } from 'date-fns';
import { router } from 'expo-router';
import { CalendarX2, ChevronLeft, ChevronRight, TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  AppCard,
  AppEmptyState,
  AppHeader,
  AppIconButton,
  AppLoading,
  AppScreen,
  AppText,
} from '@/components/ui';
import { TransactionRow } from '@/features/transactions/components/TransactionRow';
import { useFormatters } from '@/hooks/useFormatters';
import { makeStyles } from '@/theme';
import { fromIsoDate, toIsoDate, type IsoDate } from '@/utils/dates';

import { useCalendarMonth } from '../hooks/useCalendarMonth';
import { CalendarGrid } from './CalendarGrid';

/** Monthly Calendar (design-reference row 2, col 4): grid, day summary, day transactions. */
export function MonthlyCalendarView({ initialDate }: { initialDate: IsoDate | null }) {
  const styles = useStyles();
  const { t } = useTranslation('reports');
  const format = useFormatters();
  const today = new Date();
  const [selected, setSelected] = useState<IsoDate>(initialDate ?? toIsoDate(today));
  const [month, setMonth] = useState(() => startOfMonth(fromIsoDate(selected)));
  const { calendar, calendarStatus, dayTransactions, dayStatus, reload } = useCalendarMonth(
    month,
    selected,
  );

  const select = (date: IsoDate) => {
    setSelected(date);
    const dateMonth = startOfMonth(fromIsoDate(date));
    if (dateMonth.getTime() !== month.getTime()) setMonth(dateMonth);
  };

  const step = (direction: 1 | -1) => {
    const next = addMonths(month, direction);
    setMonth(next);
    // Keep the selection inside the visible month: today if it is there, else the 1st.
    const todayIso = toIsoDate(today);
    setSelected(todayIso.startsWith(toIsoDate(next).slice(0, 7)) ? todayIso : toIsoDate(next));
  };

  const dayIncome = dayTransactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amountMinor, 0);
  const dayExpense = dayTransactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amountMinor, 0);

  return (
    <AppScreen header={<AppHeader title={t('calendar.title')} back />}>
      <View style={styles.monthNav}>
        <AppIconButton
          icon={ChevronLeft}
          accessibilityLabel={t('calendar.previousMonth')}
          onPress={() => step(-1)}
          mirrorInRTL
        />
        <AppText
          variant="heading3"
          align="center"
          style={styles.flex}
          accessibilityLiveRegion="polite">
          {format.monthYear(month)}
        </AppText>
        <AppIconButton
          icon={ChevronRight}
          accessibilityLabel={t('calendar.nextMonth')}
          onPress={() => step(1)}
          mirrorInRTL
        />
      </View>

      {calendarStatus === 'error' ? (
        <AppEmptyState
          icon={TriangleAlert}
          tone="error"
          title={t('calendar.error')}
          action={{ label: t('error.retry'), onPress: reload }}
        />
      ) : calendar === null ? (
        <AppLoading />
      ) : (
        <AppCard padding="md" style={styles.gridCard}>
          <CalendarGrid days={calendar.days} selectedDate={selected} onSelect={select} />
          <AppText variant="caption" color="textSecondary" align="center">
            {t('calendar.monthTotals', {
              income: format.money(calendar.incomeMinor),
              expense: format.money(calendar.expenseMinor),
            })}
          </AppText>
        </AppCard>
      )}

      <View style={styles.section}>
        <View>
          <AppText variant="heading3" accessibilityRole="header">
            {t('calendar.daySummary')}
          </AppText>
          <AppText variant="bodySmall" color="textSecondary">
            {format.longDate(selected)}
          </AppText>
        </View>
        <View style={styles.totals}>
          <AppCard variant="income" style={styles.flex}>
            <AppText variant="caption" color="textSecondary">
              {t('calendar.income')}
            </AppText>
            <AppText variant="bodyMedium" color="income" numberOfLines={1} constrainScale>
              {format.money(dayIncome)}
            </AppText>
          </AppCard>
          <AppCard variant="expense" style={styles.flex}>
            <AppText variant="caption" color="textSecondary">
              {t('calendar.expense')}
            </AppText>
            <AppText variant="bodyMedium" color="expense" numberOfLines={1} constrainScale>
              {format.money(dayExpense)}
            </AppText>
          </AppCard>
        </View>
        {dayStatus === 'loading' && dayTransactions.length === 0 ? (
          <AppLoading />
        ) : dayStatus === 'error' ? (
          <AppEmptyState
            icon={TriangleAlert}
            tone="error"
            title={t('calendar.error')}
            action={{ label: t('error.retry'), onPress: reload }}
          />
        ) : dayTransactions.length === 0 ? (
          <AppEmptyState icon={CalendarX2} title={t('calendar.noTransactions')} />
        ) : (
          <AppCard padding="md">
            {dayTransactions.map((tx) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                today={today}
                showDate={false}
                onPress={() =>
                  router.push({ pathname: '/transaction/[id]', params: { id: String(tx.id) } })
                }
              />
            ))}
          </AppCard>
        )}
      </View>
    </AppScreen>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  gridCard: { gap: t.spacing.md },
  section: { gap: t.spacing.md },
  totals: { flexDirection: 'row', gap: t.spacing.md },
}));
