/**
 * Versioned JSON backup format (pure — no I/O, no database).
 *
 * v1 document:
 *   { format, schemaVersion, appVersion, exportedAt, databaseVersion,
 *     settings: { uiLanguage?, voiceLanguage?, themeMode?, currency? },
 *     categories: CategorySnapshot[], transactions: TransactionSnapshot[], budgets: BudgetSnapshot[] }
 *
 * Money stays integer minor units (paise); dates stay local 'YYYY-MM-DD' strings; ids are
 * kept so category ↔ transaction ↔ budget relationships survive a restore.
 */
import { z } from 'zod';

import { BUDGET_MONTH_PATTERN } from '@/features/budgets/schemas';
import type { LanguageCode, VoiceLanguage } from '@/i18n/languages';
import type { ThemeMode } from '@/theme/theme';
import { PAYMENT_METHODS, type CurrencyCode } from '@/types/money';
import { isIsoDate } from '@/utils/dates';
import { isCurrencyCode } from '@/utils/money';

import type { DataSnapshot, DataTables } from './types';

export const BACKUP_FORMAT = 'monthly-expense-tracker-backup';
/** Bump when the document shape changes; add a migration path in `backupValidation`. */
export const BACKUP_SCHEMA_VERSION = 1;
export const BACKUP_MIME_TYPE = 'application/json';

export interface BackupSettings {
  uiLanguage?: LanguageCode;
  voiceLanguage?: VoiceLanguage;
  themeMode?: ThemeMode;
  currency?: CurrencyCode;
}

export interface BackupDocument extends DataTables {
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  appVersion: string;
  /** ISO-8601 UTC timestamp. */
  exportedAt: string;
  databaseVersion: number;
  settings: BackupSettings;
}

export interface BackupMeta {
  appVersion: string;
  exportedAt: Date;
}

export function createBackupDocument(
  snapshot: DataSnapshot,
  settings: BackupSettings,
  meta: BackupMeta,
): BackupDocument {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appVersion: meta.appVersion,
    exportedAt: meta.exportedAt.toISOString(),
    databaseVersion: snapshot.databaseVersion,
    settings,
    categories: snapshot.categories,
    transactions: snapshot.transactions,
    budgets: snapshot.budgets,
  };
}

/** UTF-8 JSON text (JSON.stringify keeps Bengali/Hindi characters as-is). */
export function serializeBackup(doc: BackupDocument): string {
  return `${JSON.stringify(doc, null, 2)}\n`;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** `expense-tracker-backup_2026-11-12_0930.json` in local time. */
export function backupFileName(date: Date): string {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `expense-tracker-backup_${day}_${pad(date.getHours())}${pad(date.getMinutes())}.json`;
}

// ---- v1 schema --------------------------------------------------------------------------

const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const timestamp = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const amountMinor = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const currency = z.string().refine(isCurrencyCode);
const txType = z.enum(['expense', 'income']);
const isoDate = z.string().refine(isIsoDate);
const shortText = z.string().max(10_000);

const categorySchema = z.object({
  id,
  key: z.string().min(1).max(100),
  type: txType,
  icon: z.string().min(1).max(100),
  color: z.string().min(1).max(100),
  sortOrder: z.number().int(),
  isSystem: z.boolean(),
  isArchived: z.boolean(),
  customName: shortText.nullable(),
  createdAt: timestamp,
});

const transactionSchema = z.object({
  id,
  type: txType,
  amountMinor,
  currency,
  categoryId: id,
  occurredOn: isoDate,
  note: shortText.nullable(),
  paymentMethod: z.enum(PAYMENT_METHODS).nullable(),
  source: z.enum(['manual', 'voice']),
  voiceTranscript: shortText.nullable(),
  createdAt: timestamp,
  updatedAt: timestamp,
});

const budgetSchema = z
  .object({
    id,
    budgetType: z.enum(['overall', 'category']),
    categoryId: id.nullable(),
    amountMinor,
    currency,
    month: z.string().regex(BUDGET_MONTH_PATTERN),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .refine((b) => (b.budgetType === 'overall') === (b.categoryId === null));

export const backupDocumentSchemaV1 = z.object({
  format: z.literal(BACKUP_FORMAT),
  schemaVersion: z.literal(1),
  appVersion: z.string().max(100),
  exportedAt: z.iso.datetime(),
  databaseVersion: z.number().int().nonnegative(),
  // Each setting is checked individually during restore; unknown values are ignored there.
  settings: z.record(z.string(), z.unknown()),
  categories: z.array(categorySchema),
  transactions: z.array(transactionSchema),
  budgets: z.array(budgetSchema),
});
