import { router } from 'expo-router';
import { Languages, Mic, ShieldCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppButton, AppCard, AppHeader, AppScreen, AppText } from '@/components/ui';
import { getLanguage } from '@/i18n/languages';
import { makeStyles } from '@/theme';

import { useVoiceSettings } from '../hooks/useVoiceSettings';
import { RadioOptionRow } from './RadioOptionRow';
import { SettingsRow } from './SettingsRow';
import { SettingsSection } from './SettingsSection';

export function VoiceSettingsView() {
  const styles = useStyles();
  const { t } = useTranslation('settings');
  const {
    voiceLanguage,
    options,
    setVoiceLanguage,
    capabilities,
    recheck,
    requestPermission,
    openSystemSettings,
  } = useVoiceSettings();

  const checking = capabilities === null;
  const pending = t('voice.checking');
  const permission = capabilities?.permission ?? null;
  const support = capabilities?.localeSupport ?? null;

  // Most important problem first; manual entry is always offered as the fallback.
  const problem = checking
    ? null
    : !capabilities.available
      ? t('voice.unavailableMessage')
      : permission === 'blocked'
        ? t('voice.blockedMessage')
        : support === 'unsupported'
          ? t('voice.languageUnsupportedMessage')
          : null;

  return (
    <AppScreen
      header={<AppHeader title={t('voice.title')} back />}
      edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.section}>
        <AppText variant="bodySmall" color="textSecondary" accessibilityRole="header">
          {t('voice.languageTitle')}
        </AppText>
        <AppCard padding="lg" style={styles.card}>
          <View accessibilityRole="radiogroup">
            {options.map((code, i) => {
              const lang = getLanguage(code);
              return (
                <RadioOptionRow
                  key={code}
                  label={lang.nativeName}
                  labelScript={lang.script}
                  description={lang.englishName}
                  descriptionScript="latin"
                  selected={code === voiceLanguage}
                  showDivider={i > 0}
                  onPress={() => setVoiceLanguage(code)}
                />
              );
            })}
          </View>
        </AppCard>
        <AppText variant="bodySmall" color="textSecondary">
          {t('voice.languageHint')}
        </AppText>
      </View>

      <SettingsSection title={t('voice.statusTitle')}>
        <SettingsRow
          icon={Mic}
          label={t('voice.recognizer')}
          value={
            checking
              ? pending
              : capabilities.available
                ? t('voice.available')
                : t('voice.unavailable')
          }
        />
        {capabilities?.available ? (
          <SettingsRow
            icon={ShieldCheck}
            label={t('voice.permission')}
            value={permission ? t(`voice.${permission}`) : pending}
          />
        ) : null}
        {capabilities?.available ? (
          <SettingsRow
            icon={Languages}
            label={t('voice.languageSupport')}
            hint={support ? t(`voice.support.${support}`) : pending}
          />
        ) : null}
      </SettingsSection>

      {problem ? (
        <AppCard variant="muted" padding="lg" style={styles.problem}>
          <AppText variant="bodyMedium">{t('voice.unavailableTitle')}</AppText>
          <AppText variant="bodySmall" color="textSecondary">
            {problem}
          </AppText>
        </AppCard>
      ) : null}

      <View style={styles.actions}>
        {permission === 'denied' ? (
          <AppButton label={t('voice.allow')} onPress={() => void requestPermission()} fullWidth />
        ) : null}
        {permission === 'blocked' ? (
          <AppButton label={t('voice.openSettings')} onPress={openSystemSettings} fullWidth />
        ) : null}
        <AppButton
          label={t('voice.addManually')}
          variant="secondary"
          onPress={() => router.push('/transaction/new')}
          fullWidth
        />
        <AppButton label={t('voice.recheck')} variant="ghost" onPress={recheck} fullWidth />
      </View>

      <AppText variant="caption" color="textSecondary">
        {t('voice.serviceNote')}
      </AppText>
    </AppScreen>
  );
}

const useStyles = makeStyles((t) => ({
  section: { gap: t.spacing.sm },
  card: { paddingVertical: t.spacing.xs },
  problem: { gap: t.spacing.xs },
  actions: { gap: t.spacing.sm },
}));
