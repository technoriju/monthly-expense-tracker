import { useLocalSearchParams } from 'expo-router';

import { TransactionFormView } from '@/features/transactions/components/TransactionFormView';

export default function NewTransactionScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const initialType = type === 'income' ? 'income' : 'expense';
  return <TransactionFormView mode={{ kind: 'create', initialType }} />;
}
