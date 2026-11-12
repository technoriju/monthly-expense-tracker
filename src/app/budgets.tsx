import { useLocalSearchParams } from 'expo-router';

import { BudgetView } from '@/features/budgets/components/BudgetView';
import { parseBudgetMonth } from '@/features/budgets/calculations';
import { useUiStore } from '@/store/uiStore';

export default function BudgetsScreen() {
  const { month } = useLocalSearchParams<{ month?: string }>();
  const fallback = useUiStore((s) => s.selectedMonth);
  return <BudgetView initialMonth={(month && parseBudgetMonth(month)) || fallback} />;
}
