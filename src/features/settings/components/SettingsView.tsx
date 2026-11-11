import { router } from 'expo-router';
import { Globe, IndianRupee, Info, Smartphone, SunMoon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { AppHeader, AppScreen, AppText } from '@/components/ui';
import { useActiveLanguage } from '@/hooks/useActiveLanguage';
import { useSettingsStore } from '@/store/settingsStore';
import { getCurrencyInfo } from '@/utils/money';

import { useAppInfo } from '../hooks/useAppInfo';
import { SettingsRow } from './SettingsRow';
import { SettingsSection } from './SettingsSection';

export function SettingsView() {
  const { t } = useTranslation('settings');
  const { t: tc } = useTranslation('common');
  const language = useActiveLanguage();
  const currency = useSettingsStore((s) => s.currency);
  const { version } = useAppInfo();

  return (
    <AppScreen header={<AppHeader title={t('title')} />}>
      <SettingsSection title={t('sections.preferences')}>
        <SettingsRow
          icon={Globe}
          label={t('language.label')}
          value={language.nativeName}
          valueScript={language.script}
          onPress={() => router.push('/settings/language')}
        />
        <SettingsRow
          icon={IndianRupee}
          label={t('currency.label')}
          value={`${getCurrencyInfo(currency).symbol} ${t(`currency.names.${currency}`)}`}
        />
        <SettingsRow
          icon={SunMoon}
          label={t('theme.label')}
          value={t('theme.light')}
          hint={t('theme.comingSoon')}
          disabled
        />
      </SettingsSection>

      <SettingsSection title={t('sections.about')}>
        <SettingsRow icon={Info} label={t('about.appName')} value={tc('appName')} />
        <SettingsRow icon={Smartphone} label={t('about.version')} value={version} />
      </SettingsSection>
      <AppText variant="bodySmall" color="textSecondary" align="center">
        {t('about.description')}
      </AppText>
    </AppScreen>
  );
}
