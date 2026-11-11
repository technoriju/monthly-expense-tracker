import { getLanguage, type LanguageDefinition } from '@/i18n/languages';
import { useSettingsStore } from '@/store/settingsStore';

/** The active UI language definition (script, direction, Intl locale). */
export function useActiveLanguage(): LanguageDefinition {
  const code = useSettingsStore((s) => s.uiLanguage);
  return getLanguage(code);
}
