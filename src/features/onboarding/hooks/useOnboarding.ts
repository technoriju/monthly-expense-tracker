import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { settingsService } from '@/features/settings/services/settingsService';
import { useUiStore } from '@/store/uiStore';

/** Finishing (or skipping) onboarding persists the flag; the root navigator then shows the tabs. */
export function useOnboarding() {
  const [finishing, setFinishing] = useState(false);
  const { t } = useTranslation('settings');
  const showToast = useUiStore((s) => s.showToast);

  async function finish(): Promise<void> {
    if (finishing) return;
    setFinishing(true);
    try {
      await settingsService.completeOnboarding();
    } catch (error) {
      console.error('Saving onboarding state failed', error);
      showToast(t('errors.saveFailed'), 'error');
      setFinishing(false);
    }
  }

  return { finishing, finish };
}
