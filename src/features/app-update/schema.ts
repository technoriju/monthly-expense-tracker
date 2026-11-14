import { z } from 'zod';

import { MAX_RELEASE_NOTES, MAX_TEXT_LENGTH } from './constants';
import { isVersion } from './version';

/** Only store links: https pages and the Play / App Store app schemes. Placeholders fail. */
const STORE_URL_PATTERN = /^(https:\/\/|market:\/\/|itms-apps:\/\/)[^\s]+$/i;

/** Key used for a plain (not per-language) list or message. */
export const DEFAULT_TEXT_KEY = 'default';

const version = z.string().trim().refine(isVersion, 'Invalid version');
const text = z
  .string()
  .trim()
  .min(1)
  .transform((s) => s.slice(0, MAX_TEXT_LENGTH));
const notes = z.array(z.unknown()).transform((items) =>
  items
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim().slice(0, MAX_TEXT_LENGTH))
    .slice(0, MAX_RELEASE_NOTES),
);
// `default` too, so the normalized shape (as cached) parses back unchanged.
const languageCode = z.string().regex(/^([a-z]{2,3}|default)$/);

/**
 * Remote update policy. Only the two versions are required; every other field is optional and
 * dropped (not fatal) when malformed, so older and newer files both keep working.
 * `releaseNotes` / `message` may be plain or per-language (`{ "en": [...], "bn": [...] }`);
 * both are normalized to a language → value map (plain values under `default`).
 */
export const updateConfigSchema = z.object({
  latestVersion: version,
  minimumSupportedVersion: version,
  forceUpdate: z.boolean().optional().catch(undefined),
  storeUrlAndroid: z.string().trim().regex(STORE_URL_PATTERN).optional().catch(undefined),
  storeUrlIOS: z.string().trim().regex(STORE_URL_PATTERN).optional().catch(undefined),
  releaseNotes: z
    .union([
      notes.transform((list) => ({ [DEFAULT_TEXT_KEY]: list })),
      z.record(languageCode, notes),
    ])
    .optional()
    .catch(undefined),
  message: z
    .union([text.transform((m) => ({ [DEFAULT_TEXT_KEY]: m })), z.record(languageCode, text)])
    .optional()
    .catch(undefined),
  updatedAt: z.string().trim().max(64).optional().catch(undefined),
});

export type UpdateConfig = z.infer<typeof updateConfigSchema>;

/** Validates unknown JSON; null when the file can't be used. */
export function parseUpdateConfig(raw: unknown): UpdateConfig | null {
  const result = updateConfigSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/** Picks the UI language's entry, then English, then the plain value. */
export function pickLocalized<T>(
  values: Record<string, T> | undefined,
  language: string,
): T | undefined {
  if (!values) return undefined;
  return values[language] ?? values.en ?? values[DEFAULT_TEXT_KEY];
}
