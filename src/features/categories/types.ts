import type { TranslationResources } from '@/i18n/resources';

/**
 * System category identifiers. Stored as-is in the DB, never translated;
 * display names come from the `categories` i18n namespace.
 */
export type CategoryKey = keyof TranslationResources['categories'];
