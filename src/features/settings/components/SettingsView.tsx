import { router } from 'expo-router';
import {
  DatabaseBackup,
  FileSpreadsheet,
  Globe,
  History,
  IndianRupee,
  Info,
  LockKeyhole,
  Megaphone,
  Mic,
  ShieldCheck,
  SunMoon,
  Trash2,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { AppHeader, AppScreen, AppText } from '@/components/ui';
import { showAdPrivacyOptions } from '@/features/ads/services/adsService';
import { useClearData } from '@/features/data-management/hooks/useClearData';
import { useActiveLanguage } from '@/hooks/useActiveLanguage';
import { appLockMethodLabelKey } from '@/features/security/methodLabel';
import { getLanguage } from '@/i18n/languages';
import { useAdsStore } from '@/store/adsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { getCurrencyInfo } from '@/utils/money';

import { SettingsRow } from './SettingsRow';
import { SettingsSection } from './SettingsSection';

export function SettingsView() {
  const { t } = useTranslation('settings');
  const language = useActiveLanguage();
  const currency = useSettingsStore((s) => s.currency);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const voiceLanguage = getLanguage(useSettingsStore((s) => s.voiceLanguage));
  const confirmClear = useClearData();
  const appLockMethod = useSettingsStore((s) => s.appLockMethod);
  const adPrivacyOptionsRequired = useAdsStore((s) => s.privacyOptionsRequired);

  return (
    <AppScreen
      header={<AppHeader title={t('title')} back />}
      edges={['top', 'left', 'right', 'bottom']}>
      <SettingsSection title={t('sections.general')}>
        <SettingsRow
          icon={Globe}
          label={t('language.label')}
          value={language.nativeName}
          valueScript={language.script}
          onPress={() => router.push('/settings/language')}
        />
        <SettingsRow
          icon={SunMoon}
          label={t('theme.label')}
          value={t(`theme.${themeMode}`)}
          onPress={() => router.push('/settings/theme')}
        />
        <SettingsRow
          icon={IndianRupee}
          label={t('currency.label')}
          value={`${getCurrencyInfo(currency).symbol} ${t(`currency.names.${currency}`)}`}
          hint={t('currency.hint')}
        />
      </SettingsSection>

      <SettingsSection title={t('sections.voice')}>
        <SettingsRow
          icon={Mic}
          label={t('voice.label')}
          value={voiceLanguage.nativeName}
          valueScript={voiceLanguage.script}
          onPress={() => router.push('/settings/voice')}
        />
      </SettingsSection>

      <SettingsSection title={t('sections.security')}>
        <SettingsRow
          icon={LockKeyhole}
          label={t('appLock.label')}
          value={t(appLockMethodLabelKey(appLockMethod, 'other'))}
          onPress={() => router.push('/settings/app-lock')}
        />
      </SettingsSection>

      <SettingsSection title={t('sections.data')}>
        <SettingsRow
          icon={DatabaseBackup}
          label={t('data.backup')}
          hint={t('data.backupHint')}
          onPress={() => router.push('/settings/backup')}
        />
        <SettingsRow
          icon={History}
          label={t('data.restore')}
          hint={t('data.restoreHint')}
          onPress={() => router.push('/settings/restore')}
        />
        <SettingsRow
          icon={FileSpreadsheet}
          label={t('data.export')}
          hint={t('data.exportHint')}
          onPress={() => router.push('/settings/export')}
        />
        <SettingsRow
          icon={Trash2}
          label={t('data.clear')}
          hint={t('data.clearHint')}
          tone="danger"
          onPress={confirmClear}
        />
      </SettingsSection>

      <SettingsSection title={t('sections.about')}>
        <SettingsRow
          icon={Info}
          label={t('about.label')}
          onPress={() => router.push('/settings/about')}
        />
        <SettingsRow
          icon={ShieldCheck}
          label={t('about.privacy')}
          onPress={() => router.push('/settings/privacy')}
        />
        {adPrivacyOptionsRequired ? (
          <SettingsRow
            icon={Megaphone}
            label={t('about.adPrivacy')}
            onPress={() => void showAdPrivacyOptions()}
          />
        ) : null}
      </SettingsSection>
      <AppText variant="bodySmall" color="textSecondary" align="center">
        {t('about.description')}
      </AppText>
    </AppScreen>
  );
}
