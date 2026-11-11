import bnCategories from './locales/bn/categories.json';
import bnCommon from './locales/bn/common.json';
import bnDashboard from './locales/bn/dashboard.json';
import bnSettings from './locales/bn/settings.json';
import bnTransactions from './locales/bn/transactions.json';
import enCategories from './locales/en/categories.json';
import enCommon from './locales/en/common.json';
import enDashboard from './locales/en/dashboard.json';
import enSettings from './locales/en/settings.json';
import enTransactions from './locales/en/transactions.json';
import hiCategories from './locales/hi/categories.json';
import hiCommon from './locales/hi/common.json';
import hiDashboard from './locales/hi/dashboard.json';
import hiSettings from './locales/hi/settings.json';
import hiTransactions from './locales/hi/transactions.json';

import type { LanguageCode } from './languages';

export const NAMESPACES = [
  'common',
  'dashboard',
  'transactions',
  'categories',
  'settings',
] as const;
export type Namespace = (typeof NAMESPACES)[number];

/** English is the schema: every other language must provide the same keys (type-checked). */
const en = {
  common: enCommon,
  dashboard: enDashboard,
  transactions: enTransactions,
  categories: enCategories,
  settings: enSettings,
};

export type TranslationResources = typeof en;

const bn: TranslationResources = {
  common: bnCommon,
  dashboard: bnDashboard,
  transactions: bnTransactions,
  categories: bnCategories,
  settings: bnSettings,
};

const hi: TranslationResources = {
  common: hiCommon,
  dashboard: hiDashboard,
  transactions: hiTransactions,
  categories: hiCategories,
  settings: hiSettings,
};

/**
 * Bundled translations. Only languages with status `complete`/`partial` in `languages.ts`
 * appear here. To add a language: create `locales/<code>/*.json`, register it below,
 * and flip its status in the registry.
 */
export const resources: Partial<Record<LanguageCode, TranslationResources>> = { en, bn, hi };

export const englishResources = en;
