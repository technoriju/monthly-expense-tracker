import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LANGUAGE, type LanguageCode } from './languages';
import { NAMESPACES, resources } from './resources';

// App-owned instance; `initReactI18next` registers it for `useTranslation`.
const i18n = createInstance();

// Resources are bundled, so initialization is synchronous and safe at module load.
void i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  ns: NAMESPACES,
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  initAsync: false,
});

/** Switches the UI language for all mounted components (no restart for LTR languages). */
export async function changeUiLanguage(code: LanguageCode): Promise<void> {
  await i18n.changeLanguage(code);
}

export { i18n };
export * from './languages';
export { resolveFont, FONT_SOURCES } from './fonts';
export { NAMESPACES, type Namespace } from './resources';
