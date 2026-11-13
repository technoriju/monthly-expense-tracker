import { useLocalSearchParams } from 'expo-router';

import { ReceiptDetailView } from '@/features/receipts/components/ReceiptDetailView';

/** `id` is the expense (transaction) id the receipt is attached to. */
export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ReceiptDetailView transactionId={Number(id)} />;
}
