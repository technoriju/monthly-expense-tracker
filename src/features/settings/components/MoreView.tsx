import { router } from 'expo-router';
import { LifeBuoy, Settings, Shapes } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { AppHeader, AppScreen } from '@/components/ui';

import { SettingsRow } from './SettingsRow';
import { SettingsSection } from './SettingsSection';

/** More tab: entry points to Categories, Settings and Help & Support. */
export function MoreView() {
  const { t } = useTranslation('settings');
  return (
    <AppScreen header={<AppHeader title={t('more.title')} />}>
      <SettingsSection title={t('more.section')}>
        <SettingsRow
          icon={Shapes}
          label={t('more.categories')}
          hint={t('more.categoriesHint')}
          onPress={() => router.push('/categories')}
        />
        <SettingsRow
          icon={Settings}
          label={t('title')}
          onPress={() => router.push('/settings')}
        />
        <SettingsRow
          icon={LifeBuoy}
          label={t('help.title')}
          hint={t('help.rowHint')}
          onPress={() => router.push('/help')}
        />
      </SettingsSection>
    </AppScreen>
  );
}
