import { render, screen } from '@testing-library/react-native';

import { AppText } from '@/components/ui/AppText';
import { settingsRepository } from '@/database';
import { i18n } from '@/i18n';
import { useSettingsStore } from '@/store/settingsStore';

import { settingsService } from '../services/settingsService';

jest.mock('@/database', () => {
  const store = new Map<string, unknown>();
  return {
    settingsRepository: {
      get: jest.fn(async (key: string) => store.get(key)),
      getAll: jest.fn(async () => Object.fromEntries(store)),
      set: jest.fn(async (key: string, value: unknown) => {
        store.set(key, value);
      }),
    },
  };
});

describe('settingsService', () => {
  it('hydrates from the device language when nothing is saved', async () => {
    await settingsService.hydrate(['hi', 'en']);
    expect(useSettingsStore.getState().uiLanguage).toBe('hi');
    expect(i18n.language).toBe('hi');
    expect(i18n.t('tabs.home')).toBe('होम');
  });

  it('persists the language, switches i18n live, and updates the store', async () => {
    await settingsService.setUiLanguage('bn');
    expect(settingsRepository.set).toHaveBeenCalledWith('uiLanguage', 'bn');
    expect(i18n.language).toBe('bn');
    expect(i18n.t('settings:title')).toBe('সেটিংস');
    expect(useSettingsStore.getState().uiLanguage).toBe('bn');
  });

  it('restores the saved language on the next hydrate', async () => {
    await settingsService.hydrate(['en']);
    expect(useSettingsStore.getState().uiLanguage).toBe('bn');
  });

  it('rejects languages that are not available yet', async () => {
    await expect(settingsService.setUiLanguage('ta')).rejects.toThrow();
    expect(useSettingsStore.getState().uiLanguage).toBe('bn');
  });
});

describe('script-aware typography', () => {
  it.each([
    ['en', 'Inter_700Bold', 31],
    ['bn', 'NotoSansBengali_700Bold', 36],
    ['hi', 'NotoSansDevanagari_700Bold', 36],
  ] as const)('%s uses %s with a script line height', async (code, fontFamily, lineHeight) => {
    useSettingsStore.getState().applySettings({ uiLanguage: code });
    await render(<AppText variant="heading1">x</AppText>);
    expect(screen.getByText('x')).toHaveStyle({ fontFamily, lineHeight });
  });
});
