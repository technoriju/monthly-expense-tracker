import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useUiStore } from '@/store/uiStore';

import { profileImageService } from '../services/profileImageService';

export function useProfileImage() {
  const { t } = useTranslation('dashboard');
  const showToast = useUiStore((s) => s.showToast);
  const [uri, setUri] = useState(() => profileImageService.getUri());

  const pick = async (): Promise<boolean> => {
    try {
      const next = await profileImageService.pick();
      if (!next) return false;
      setUri(next);
      return true;
    } catch (error: unknown) {
      console.error('Setting profile photo failed', error);
      showToast(t('profilePhoto.saveFailed'), 'error');
      return false;
    }
  };

  const remove = () => {
    try {
      profileImageService.remove();
      setUri(null);
    } catch (error: unknown) {
      console.error('Removing profile photo failed', error);
      showToast(t('profilePhoto.removeFailed'), 'error');
    }
  };

  return { uri, pick, remove };
}
