import { SquarePen } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/components/layout/PlaceholderScreen';

export default function NewTransactionScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      icon={SquarePen}
      title={t('placeholders.addTransaction.title')}
      message={t('placeholders.addTransaction.message')}
      isStackScreen
    />
  );
}
