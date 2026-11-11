import { useLocalSearchParams } from 'expo-router';

import { EditTransactionView } from '@/features/transactions/components/EditTransactionView';

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditTransactionView id={Number(id)} />;
}
