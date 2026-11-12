import { Mail, MessageCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';

import { AppCard, AppHeader, AppScreen, AppText } from '@/components/ui';
import { useUiStore } from '@/store/uiStore';
import { makeStyles } from '@/theme';

import { getAppInfo } from '../appInfo';
import {
  SUPPORT_EMAIL,
  SUPPORT_WHATSAPP_DISPLAY,
  supportEmailUrl,
  supportWhatsAppUrl,
} from '../supportContact';
import { SettingsRow } from './SettingsRow';
import { SettingsSection } from './SettingsSection';

const FAQS = ['add', 'voice', 'edit', 'budgets', 'export', 'backup', 'language', 'privacy'] as const;

/** Contact options (email, WhatsApp) and answers to common questions. */
export function HelpView() {
  const styles = useStyles();
  const { t } = useTranslation('settings');
  const showToast = useUiStore((s) => s.showToast);

  // Opens the user's own mail/WhatsApp app; the app itself sends nothing.
  const open = (url: string) => {
    Linking.openURL(url).catch(() => showToast(t('help.openFailed'), 'error'));
  };

  const emailSubject = t('help.emailSubject', { version: getAppInfo().version });

  return (
    <AppScreen
      header={<AppHeader title={t('help.title')} back />}
      edges={['top', 'left', 'right', 'bottom']}>
      <AppText variant="body" color="textSecondary">
        {t('help.intro')}
      </AppText>

      <SettingsSection title={t('help.contactSection')}>
        <SettingsRow
          icon={Mail}
          label={t('help.email')}
          hint={SUPPORT_EMAIL}
          onPress={() => open(supportEmailUrl(emailSubject))}
        />
        <SettingsRow
          icon={MessageCircle}
          label={t('help.whatsapp')}
          hint={SUPPORT_WHATSAPP_DISPLAY}
          onPress={() => open(supportWhatsAppUrl())}
        />
      </SettingsSection>

      <AppText variant="bodySmall" color="textSecondary">
        {t('help.safetyNote')}
      </AppText>

      <AppText variant="bodyMedium" accessibilityRole="header">
        {t('help.faqSection')}
      </AppText>
      {FAQS.map((key) => (
        <AppCard key={key} padding="lg" style={styles.card}>
          <AppText variant="bodyMedium" accessibilityRole="header">
            {t(`help.faq.${key}.q`)}
          </AppText>
          <AppText variant="bodySmall" color="textSecondary">
            {t(`help.faq.${key}.a`)}
          </AppText>
        </AppCard>
      ))}
    </AppScreen>
  );
}

const useStyles = makeStyles((t) => ({
  card: { gap: t.spacing.xs },
}));
