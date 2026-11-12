import bnBudgets from './locales/bn/budgets.json';
import bnCategories from './locales/bn/categories.json';
import bnCommon from './locales/bn/common.json';
import bnDataManagement from './locales/bn/dataManagement.json';
import bnDashboard from './locales/bn/dashboard.json';
import bnReports from './locales/bn/reports.json';
import bnSettings from './locales/bn/settings.json';
import bnTransactions from './locales/bn/transactions.json';
import bnOnboarding from './locales/bn/onboarding.json';
import bnVoice from './locales/bn/voice.json';
import enBudgets from './locales/en/budgets.json';
import enCategories from './locales/en/categories.json';
import enCommon from './locales/en/common.json';
import enDataManagement from './locales/en/dataManagement.json';
import enDashboard from './locales/en/dashboard.json';
import enReports from './locales/en/reports.json';
import enSettings from './locales/en/settings.json';
import enTransactions from './locales/en/transactions.json';
import enOnboarding from './locales/en/onboarding.json';
import enVoice from './locales/en/voice.json';
import hiBudgets from './locales/hi/budgets.json';
import hiCategories from './locales/hi/categories.json';
import hiCommon from './locales/hi/common.json';
import hiDataManagement from './locales/hi/dataManagement.json';
import hiDashboard from './locales/hi/dashboard.json';
import hiReports from './locales/hi/reports.json';
import hiSettings from './locales/hi/settings.json';
import hiTransactions from './locales/hi/transactions.json';
import hiOnboarding from './locales/hi/onboarding.json';
import hiVoice from './locales/hi/voice.json';

import type { LanguageCode } from './languages';

export const NAMESPACES = [
  'common',
  'dashboard',
  'transactions',
  'categories',
  'settings',
  'voice',
  'reports',
  'budgets',
  'dataManagement',
  'onboarding',
] as const;
export type Namespace = (typeof NAMESPACES)[number];

/** English is the schema: every other language must provide the same keys (type-checked). */
const en = {
  common: enCommon,
  dashboard: enDashboard,
  reports: enReports,
  budgets: enBudgets,
  transactions: enTransactions,
  categories: enCategories,
  settings: enSettings,
  dataManagement: enDataManagement,
  voice: enVoice,
  onboarding: enOnboarding,
};

export type TranslationResources = typeof en;

const bn: TranslationResources = {
  common: bnCommon,
  dashboard: bnDashboard,
  reports: bnReports,
  budgets: bnBudgets,
  transactions: bnTransactions,
  categories: bnCategories,
  settings: bnSettings,
  dataManagement: bnDataManagement,
  voice: bnVoice,
  onboarding: bnOnboarding,
};

const hi: TranslationResources = {
  common: hiCommon,
  dashboard: hiDashboard,
  reports: hiReports,
  budgets: hiBudgets,
  transactions: hiTransactions,
  categories: hiCategories,
  settings: hiSettings,
  dataManagement: hiDataManagement,
  voice: hiVoice,
  onboarding: hiOnboarding,
};

/**
 * Bundled translations. Only languages with status `complete`/`partial` in `languages.ts`
 * appear here. To add a language: create `locales/<code>/*.json`, register it below,
 * and flip its status in the registry.
 */
export const resources: Partial<Record<LanguageCode, TranslationResources>> = { en, bn, hi };

export const englishResources = en;
