import { useLocalSearchParams } from 'expo-router';

import { MonthlyCalendarView } from '@/features/reports/components/MonthlyCalendarView';
import { isIsoDate } from '@/utils/dates';

export default function MonthlyCalendarScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  return <MonthlyCalendarView initialDate={date && isIsoDate(date) ? date : null} />;
}
