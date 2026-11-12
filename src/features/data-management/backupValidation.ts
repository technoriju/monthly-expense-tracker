/**
 * Backup parsing and validation (pure — never touches the database). A file is restored only
 * after `parseBackup` returns `ok: true`.
 */
import { isSelectableLanguage, isVoiceLanguage } from '@/i18n/languages';
import { isThemeMode } from '@/theme/theme';
import { isCurrencyCode } from '@/utils/money';

import {
  BACKUP_FORMAT,
  BACKUP_SCHEMA_VERSION,
  backupDocumentSchemaV1,
  type BackupDocument,
  type BackupSettings,
} from './backupFormat';

/** Translated as `dataManagement:restore.errors.<code>`. */
export type BackupErrorCode =
  | 'tooLarge'
  | 'invalidJson'
  | 'notBackup'
  | 'unsupportedVersion'
  | 'invalidStructure'
  | 'inconsistent';

export type ParseBackupResult =
  { ok: true; backup: BackupDocument } | { ok: false; error: BackupErrorCode; detail?: string };

/** Larger files are rejected before parsing (far above any realistic personal backup). */
export const MAX_BACKUP_CHARS = 50 * 1024 * 1024;

const fail = (error: BackupErrorCode, detail?: string): ParseBackupResult => ({
  ok: false,
  error,
  detail,
});

/** Keeps only valid, known preferences; anything else is ignored rather than rejected. */
export function sanitizeSettings(raw: Record<string, unknown>): BackupSettings {
  const settings: BackupSettings = {};
  if (isSelectableLanguage(raw.uiLanguage)) settings.uiLanguage = raw.uiLanguage;
  if (isVoiceLanguage(raw.voiceLanguage)) settings.voiceLanguage = raw.voiceLanguage;
  if (isThemeMode(raw.themeMode)) settings.themeMode = raw.themeMode;
  if (isCurrencyCode(raw.currency)) settings.currency = raw.currency;
  return settings;
}

function hasDuplicates<T>(values: readonly T[]): boolean {
  return new Set(values).size !== values.length;
}

/** Cross-record rules the database would enforce (ids, keys, references, uniqueness). */
function findInconsistency(doc: BackupDocument): string | null {
  const { categories, transactions, budgets } = doc;
  if (hasDuplicates(categories.map((c) => c.id))) return 'duplicate category id';
  if (hasDuplicates(categories.map((c) => c.key))) return 'duplicate category key';
  if (hasDuplicates(transactions.map((t) => t.id))) return 'duplicate transaction id';
  if (hasDuplicates(budgets.map((b) => b.id))) return 'duplicate budget id';

  const categoryType = new Map(categories.map((c) => [c.id, c.type]));
  for (const t of transactions) {
    if (!categoryType.has(t.categoryId)) return `transaction ${t.id}: unknown category`;
  }
  for (const b of budgets) {
    if (b.categoryId !== null && categoryType.get(b.categoryId) !== 'expense') {
      return `budget ${b.id}: category missing or not an expense category`;
    }
  }
  const budgetSlots = budgets.map((b) => `${b.month}|${b.currency}|${b.categoryId ?? 'overall'}`);
  if (hasDuplicates(budgetSlots)) return 'duplicate budget for the same month';
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Parses and fully validates backup file text. */
export function parseBackup(text: string): ParseBackupResult {
  if (text.length > MAX_BACKUP_CHARS) return fail('tooLarge');

  let raw: unknown;
  try {
    // Tolerate a UTF-8 byte-order mark added by some editors.
    raw = JSON.parse(text.replace(/^﻿/, ''));
  } catch (error) {
    return fail('invalidJson', error instanceof Error ? error.message : undefined);
  }

  if (!isRecord(raw) || raw.format !== BACKUP_FORMAT) return fail('notBackup');
  const version = raw.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return fail('invalidStructure', 'schemaVersion');
  }
  if (version > BACKUP_SCHEMA_VERSION) return fail('unsupportedVersion', String(version));

  const parsed = backupDocumentSchemaV1.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail(
      'invalidStructure',
      issue ? `${issue.path.join('.')}: ${issue.message}` : undefined,
    );
  }

  const backup: BackupDocument = {
    ...parsed.data,
    settings: sanitizeSettings(parsed.data.settings),
  };
  const inconsistency = findInconsistency(backup);
  if (inconsistency) return fail('inconsistent', inconsistency);
  return { ok: true, backup };
}
