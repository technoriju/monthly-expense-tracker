import { ReceiptText } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/components/layout/PlaceholderScreen';

export default function TransactionsScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      icon={ReceiptText}
      title={t('placeholders.transactions.title')}
      message={t('placeholders.transactions.message')}
      isStackScreen
    />
  );
}
