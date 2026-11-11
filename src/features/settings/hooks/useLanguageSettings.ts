import { useState } from 'react';

import { getSelectableLanguages, type LanguageCode } from '@/i18n/languages';
import { useActiveLanguage } from '@/hooks/useActiveLanguage';

import { settingsService } from '../services/settingsService';

export function useLanguageSettings() {
  const current = useActiveLanguage();
  const [pending, setPending] = useState<LanguageCode | null>(null);

  async function selectLanguage(code: LanguageCode): Promise<void> {
    if (code === current.code || pending) return;
    setPending(code);
    try {
      await settingsService.setUiLanguage(code);
    } finally {
      setPending(null);
    }
  }

  return { current, options: getSelectableLanguages(), pending, selectLanguage };
}
