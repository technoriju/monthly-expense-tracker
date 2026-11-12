import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getSelectableLanguages, type LanguageCode } from '@/i18n/languages';
import { useActiveLanguage } from '@/hooks/useActiveLanguage';
import { useUiStore } from '@/store/uiStore';

import { settingsService } from '../services/settingsService';

export function useLanguageSettings() {
  const current = useActiveLanguage();
  const [pending, setPending] = useState<LanguageCode | null>(null);
  const { t } = useTranslation('settings');
  const showToast = useUiStore((s) => s.showToast);

  async function selectLanguage(code: LanguageCode): Promise<void> {
    if (code === current.code || pending) return;
    setPending(code);
    try {
      await settingsService.setUiLanguage(code);
    } catch (error) {
      console.error('Changing language failed', error);
      showToast(t('errors.saveFailed'), 'error');
    } finally {
      setPending(null);
    }
  }

  return { current, options: getSelectableLanguages(), pending, selectLanguage };
}
