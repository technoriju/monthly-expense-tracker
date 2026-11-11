/**
 * Registry of every language the app is designed to support:
 * English + the 22 scheduled languages of India (ARCHITECTURE.md §5.1).
 *
 * `status` controls visibility: only `complete` / `partial` languages appear in the picker
 * and have translation resources. `planned` entries carry metadata only — no translations.
 */
export type LanguageCode =
  | 'en'
  | 'bn'
  | 'hi'
  | 'as'
  | 'or'
  | 'mr'
  | 'gu'
  | 'pa'
  | 'ta'
  | 'te'
  | 'kn'
  | 'ml'
  | 'ur'
  | 'sa'
  | 'kok'
  | 'mni'
  | 'brx'
  | 'sat'
  | 'ks'
  | 'doi'
  | 'sd'
  | 'mai'
  | 'ne';

export type Script =
  | 'latin'
  | 'bengali'
  | 'devanagari'
  | 'odia'
  | 'gujarati'
  | 'gurmukhi'
  | 'tamil'
  | 'telugu'
  | 'kannada'
  | 'malayalam'
  | 'perso-arabic'
  | 'meitei'
  | 'ol-chiki';

export type TextDirection = 'ltr' | 'rtl';
export type LanguageStatus = 'complete' | 'partial' | 'planned';

export interface LanguageDefinition {
  code: LanguageCode;
  nativeName: string;
  englishName: string;
  script: Script;
  direction: TextDirection;
  /** BCP-47 tag used for Intl number/date formatting. */
  locale: string;
  /** Candidate speech-recognition locales (verified against the device at runtime in Phase 4). */
  speechLocales: string[];
  status: LanguageStatus;
}

export const LANGUAGES: readonly LanguageDefinition[] = [
  {
    code: 'en',
    nativeName: 'English',
    englishName: 'English',
    script: 'latin',
    direction: 'ltr',
    locale: 'en-IN',
    speechLocales: ['en-IN', 'en-US'],
    status: 'complete',
  },
  {
    code: 'bn',
    nativeName: 'বাংলা',
    englishName: 'Bengali',
    script: 'bengali',
    direction: 'ltr',
    locale: 'bn-IN',
    speechLocales: ['bn-IN', 'bn-BD'],
    status: 'complete',
  },
  {
    code: 'hi',
    nativeName: 'हिन्दी',
    englishName: 'Hindi',
    script: 'devanagari',
    direction: 'ltr',
    locale: 'hi-IN',
    speechLocales: ['hi-IN'],
    status: 'complete',
  },
  {
    code: 'as',
    nativeName: 'অসমীয়া',
    englishName: 'Assamese',
    script: 'bengali',
    direction: 'ltr',
    locale: 'as-IN',
    speechLocales: ['as-IN'],
    status: 'planned',
  },
  {
    code: 'or',
    nativeName: 'ଓଡ଼ିଆ',
    englishName: 'Odia',
    script: 'odia',
    direction: 'ltr',
    locale: 'or-IN',
    speechLocales: ['or-IN'],
    status: 'planned',
  },
  {
    code: 'mr',
    nativeName: 'मराठी',
    englishName: 'Marathi',
    script: 'devanagari',
    direction: 'ltr',
    locale: 'mr-IN',
    speechLocales: ['mr-IN'],
    status: 'planned',
  },
  {
    code: 'gu',
    nativeName: 'ગુજરાતી',
    englishName: 'Gujarati',
    script: 'gujarati',
    direction: 'ltr',
    locale: 'gu-IN',
    speechLocales: ['gu-IN'],
    status: 'planned',
  },
  {
    code: 'pa',
    nativeName: 'ਪੰਜਾਬੀ',
    englishName: 'Punjabi',
    script: 'gurmukhi',
    direction: 'ltr',
    locale: 'pa-IN',
    speechLocales: ['pa-IN', 'pa-Guru-IN'],
    status: 'planned',
  },
  {
    code: 'ta',
    nativeName: 'தமிழ்',
    englishName: 'Tamil',
    script: 'tamil',
    direction: 'ltr',
    locale: 'ta-IN',
    speechLocales: ['ta-IN'],
    status: 'planned',
  },
  {
    code: 'te',
    nativeName: 'తెలుగు',
    englishName: 'Telugu',
    script: 'telugu',
    direction: 'ltr',
    locale: 'te-IN',
    speechLocales: ['te-IN'],
    status: 'planned',
  },
  {
    code: 'kn',
    nativeName: 'ಕನ್ನಡ',
    englishName: 'Kannada',
    script: 'kannada',
    direction: 'ltr',
    locale: 'kn-IN',
    speechLocales: ['kn-IN'],
    status: 'planned',
  },
  {
    code: 'ml',
    nativeName: 'മലയാളം',
    englishName: 'Malayalam',
    script: 'malayalam',
    direction: 'ltr',
    locale: 'ml-IN',
    speechLocales: ['ml-IN'],
    status: 'planned',
  },
  {
    code: 'ur',
    nativeName: 'اردو',
    englishName: 'Urdu',
    script: 'perso-arabic',
    direction: 'rtl',
    locale: 'ur-IN',
    speechLocales: ['ur-IN'],
    status: 'planned',
  },
  {
    code: 'sa',
    nativeName: 'संस्कृतम्',
    englishName: 'Sanskrit',
    script: 'devanagari',
    direction: 'ltr',
    locale: 'sa-IN',
    speechLocales: [],
    status: 'planned',
  },
  {
    code: 'kok',
    nativeName: 'कोंकणी',
    englishName: 'Konkani',
    script: 'devanagari',
    direction: 'ltr',
    locale: 'kok-IN',
    speechLocales: [],
    status: 'planned',
  },
  {
    code: 'mni',
    nativeName: 'ꯃꯤꯇꯩꯂꯣꯟ',
    englishName: 'Manipuri',
    script: 'meitei',
    direction: 'ltr',
    locale: 'mni-IN',
    speechLocales: [],
    status: 'planned',
  },
  {
    code: 'brx',
    nativeName: 'बड़ो',
    englishName: 'Bodo',
    script: 'devanagari',
    direction: 'ltr',
    locale: 'brx-IN',
    speechLocales: [],
    status: 'planned',
  },
  {
    code: 'sat',
    nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ',
    englishName: 'Santali',
    script: 'ol-chiki',
    direction: 'ltr',
    locale: 'sat-IN',
    speechLocales: [],
    status: 'planned',
  },
  {
    code: 'ks',
    nativeName: 'کٲشُر',
    englishName: 'Kashmiri',
    script: 'perso-arabic',
    direction: 'rtl',
    locale: 'ks-IN',
    speechLocales: [],
    status: 'planned',
  },
  {
    code: 'doi',
    nativeName: 'डोगरी',
    englishName: 'Dogri',
    script: 'devanagari',
    direction: 'ltr',
    locale: 'doi-IN',
    speechLocales: [],
    status: 'planned',
  },
  {
    code: 'sd',
    nativeName: 'سنڌي',
    englishName: 'Sindhi',
    script: 'perso-arabic',
    direction: 'rtl',
    locale: 'sd-IN',
    speechLocales: [],
    status: 'planned',
  },
  {
    code: 'mai',
    nativeName: 'मैथिली',
    englishName: 'Maithili',
    script: 'devanagari',
    direction: 'ltr',
    locale: 'mai-IN',
    speechLocales: [],
    status: 'planned',
  },
  {
    code: 'ne',
    nativeName: 'नेपाली',
    englishName: 'Nepali',
    script: 'devanagari',
    direction: 'ltr',
    locale: 'ne-IN',
    speechLocales: ['ne-NP'],
    status: 'planned',
  },
];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

const BY_CODE = new Map<string, LanguageDefinition>(LANGUAGES.map((l) => [l.code, l]));

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === 'string' && BY_CODE.has(value);
}

export function getLanguage(code: LanguageCode): LanguageDefinition {
  // Every LanguageCode is present in LANGUAGES (enforced by unit test).
  return BY_CODE.get(code) ?? (BY_CODE.get(DEFAULT_LANGUAGE) as LanguageDefinition);
}

/** Languages that ship translations and may be selected in the UI. */
export function getSelectableLanguages(): LanguageDefinition[] {
  return LANGUAGES.filter((l) => l.status !== 'planned');
}

export function isSelectableLanguage(value: unknown): value is LanguageCode {
  return isLanguageCode(value) && getLanguage(value).status !== 'planned';
}

/**
 * Picks the startup UI language: saved preference → first device locale that matches a
 * selectable language → English.
 */
export function resolveInitialLanguage(
  saved: unknown,
  deviceLanguageCodes: readonly (string | null)[],
): LanguageCode {
  if (isSelectableLanguage(saved)) return saved;
  for (const code of deviceLanguageCodes) {
    const normalized = code?.toLowerCase();
    if (isSelectableLanguage(normalized)) return normalized;
  }
  return DEFAULT_LANGUAGE;
}
