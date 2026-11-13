import { useTranslation } from 'react-i18next';

import { settingsService } from '@/features/settings/services/settingsService';
import { useSettingsStore } from '@/store/settingsStore';
import { useUiStore } from '@/store/uiStore';

/** The greeting name and a saver that reports failures with a toast. */
export function useProfileName() {
  const { t } = useTranslation('dashboard');
  const showToast = useUiStore((s) => s.showToast);
  const name = useSettingsStore((s) => s.profileName);

  const save = async (next: string): Promise<void> => {
    if (next.trim() === name) return;
    try {
      await settingsService.setProfileName(next);
    } catch (error: unknown) {
      console.error('Saving profile name failed', error);
      showToast(t('profilePhoto.nameSaveFailed'), 'error');
    }
  };

  return { name, save };
}
