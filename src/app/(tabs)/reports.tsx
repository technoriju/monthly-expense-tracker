import { ChartPie } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/components/layout/PlaceholderScreen';

export default function ReportsScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      icon={ChartPie}
      title={t('placeholders.reports.title')}
      message={t('placeholders.reports.message')}
    />
  );
}
