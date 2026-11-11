import { Mic } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/components/layout/PlaceholderScreen';

export default function VoiceScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      icon={Mic}
      title={t('placeholders.voice.title')}
      message={t('placeholders.voice.message')}
    />
  );
}
