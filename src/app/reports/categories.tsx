import { useLocalSearchParams } from 'expo-router';

import { CategoryBreakdownView } from '@/features/reports/components/CategoryBreakdownView';

export default function CategoryBreakdownScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  return <CategoryBreakdownView initialType={type === 'income' ? 'income' : 'expense'} />;
}
