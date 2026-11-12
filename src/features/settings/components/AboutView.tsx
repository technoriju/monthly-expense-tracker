import { router } from 'expo-router';
import { FileText, Hash, Info, ShieldCheck, Smartphone } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { AppHeader, AppScreen, AppText } from '@/components/ui';

import { useAppInfo } from '../hooks/useAppInfo';
import { SettingsRow } from './SettingsRow';
import { SettingsSection } from './SettingsSection';

/** App metadata. No developer contact is shown because none is configured. */
export function AboutView() {
  const { t } = useTranslation('settings');
  const { t: tc } = useTranslation('common');
  const { version, buildVersion } = useAppInfo();

  return (
    <AppScreen
      header={<AppHeader title={t('about.title')} back />}
      edges={['top', 'left', 'right', 'bottom']}>
      <AppText variant="body" color="textSecondary">
        {t('about.longDescription')}
      </AppText>
      <SettingsSection title={t('sections.about')}>
        <SettingsRow icon={Info} label={t('about.appName')} value={tc('appName')} />
        <SettingsRow icon={Smartphone} label={t('about.version')} value={version} />
        {buildVersion ? (
          <SettingsRow icon={Hash} label={t('about.build')} value={buildVersion} />
        ) : null}
        <SettingsRow
          icon={ShieldCheck}
          label={t('about.privacy')}
          onPress={() => router.push('/settings/privacy')}
        />
        <SettingsRow
          icon={FileText}
          label={t('about.licenses')}
          onPress={() => router.push('/settings/licenses')}
        />
      </SettingsSection>
    </AppScreen>
  );
}
