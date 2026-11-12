import {
  BACKUP_FORMAT,
  backupFileName,
  createBackupDocument,
  serializeBackup,
  type BackupDocument,
} from '../backupFormat';
import { MAX_BACKUP_CHARS, parseBackup } from '../backupValidation';
import type { DataSnapshot } from '../types';

const snapshot: DataSnapshot = {
  databaseVersion: 3,
  categories: [
    {
      id: 1,
      key: 'food',
      type: 'expense',
      icon: 'Utensils',
      color: 'accent',
      sortOrder: 0,
      isSystem: true,
      isArchived: false,
      customName: null,
      createdAt: 10,
    },
    {
      id: 2,
      key: 'salary',
      type: 'income',
      icon: 'Wallet',
      color: 'income',
      sortOrder: 1,
      isSystem: true,
      isArchived: false,
      customName: null,
      createdAt: 10,
    },
  ],
  transactions: [
    {
      id: 1,
      type: 'expense',
      amountMinor: 12_550,
      currency: 'INR',
      categoryId: 1,
      occurredOn: '2026-11-01',
      note: 'বাজার, "মাছ"\nআর সবজি',
      paymentMethod: 'cash',
      source: 'voice',
      voiceTranscript: 'বাজার একশো পঁচিশ টাকা',
      createdAt: 20,
      updatedAt: 21,
    },
  ],
  budgets: [
    {
      id: 1,
      budgetType: 'overall',
      categoryId: null,
      amountMinor: 500_000,
      currency: 'INR',
      month: '2026-10',
      createdAt: 30,
      updatedAt: 30,
    },
    {
      id: 2,
      budgetType: 'category',
      categoryId: 1,
      amountMinor: 80_000,
      currency: 'INR',
      month: '2026-11',
      createdAt: 30,
      updatedAt: 30,
    },
  ],
};

const exportedAt = new Date('2026-11-12T04:05:06.000Z');

function validDoc(): BackupDocument {
  return createBackupDocument(
    snapshot,
    { uiLanguage: 'bn', voiceLanguage: 'en', themeMode: 'dark', currency: 'INR' },
    { appVersion: '1.0.0', exportedAt },
  );
}

/** Serializes a (possibly broken) document after applying `mutate` to a deep copy. */
function textWith(mutate: (doc: Record<string, unknown> & BackupDocument) => void): string {
  const doc = JSON.parse(serializeBackup(validDoc())) as Record<string, unknown> & BackupDocument;
  mutate(doc);
  return JSON.stringify(doc);
}

function errorOf(text: string) {
  const result = parseBackup(text);
  return result.ok ? 'ok' : result.error;
}

describe('backup generation', () => {
  it('writes metadata, preferences and every table', () => {
    const doc = validDoc();
    expect(doc).toEqual(
      expect.objectContaining({
        format: BACKUP_FORMAT,
        schemaVersion: 1,
        appVersion: '1.0.0',
        exportedAt: '2026-11-12T04:05:06.000Z',
        databaseVersion: 3,
      }),
    );
    expect(doc.transactions).toEqual(snapshot.transactions);
    expect(doc.budgets).toEqual(snapshot.budgets);
  });

  it('keeps Bengali text as UTF-8 characters, not escapes', () => {
    const text = serializeBackup(validDoc());
    expect(text).toContain('বাজার');
    expect(text).not.toMatch(/\\u09/);
  });

  it('names the file after the local date and time', () => {
    expect(backupFileName(new Date(2026, 10, 2, 9, 5))).toBe(
      'expense-tracker-backup_2026-11-02_0905.json',
    );
  });
});

describe('parseBackup', () => {
  it('accepts a generated backup and returns identical data', () => {
    const result = parseBackup(serializeBackup(validDoc()));
    expect(result).toEqual({ ok: true, backup: validDoc() });
  });

  it('tolerates a byte-order mark', () => {
    expect(errorOf(`﻿${serializeBackup(validDoc())}`)).toBe('ok');
  });

  it.each([
    ['empty file', ''],
    ['truncated file', serializeBackup(validDoc()).slice(0, 120)],
    ['random text', 'hello'],
  ])('rejects invalid JSON: %s', (_name, text) => {
    expect(errorOf(text)).toBe('invalidJson');
  });

  it.each([
    ['a JSON array', '[]'],
    ['another app’s JSON', '{"version":1,"items":[]}'],
    ['a wrong format id', textWith((d) => (d.format = 'other' as typeof BACKUP_FORMAT))],
  ])('rejects %s as not a backup', (_name, text) => {
    expect(errorOf(text)).toBe('notBackup');
  });

  it('rejects a newer schema version as unsupported', () => {
    expect(errorOf(textWith((d) => (d.schemaVersion = 2)))).toBe('unsupportedVersion');
  });

  it.each<[string, (d: Record<string, unknown> & BackupDocument) => void]>([
    ['missing schemaVersion', (d) => Reflect.deleteProperty(d, 'schemaVersion')],
    ['missing transactions', (d) => Reflect.deleteProperty(d, 'transactions')],
    ['missing exportedAt', (d) => Reflect.deleteProperty(d, 'exportedAt')],
    ['float amount', (d) => (d.transactions[0]!.amountMinor = 125.5)],
    ['zero amount', (d) => (d.transactions[0]!.amountMinor = 0)],
    [
      'amount as string',
      (d) => ((d.transactions[0] as unknown as Record<string, unknown>).amountMinor = '125'),
    ],
    ['impossible date', (d) => (d.transactions[0]!.occurredOn = '2026-02-30')],
    ['non-ISO date', (d) => (d.transactions[0]!.occurredOn = '01/11/2026')],
    [
      'unknown currency',
      (d) => ((d.transactions[0] as unknown as Record<string, unknown>).currency = 'USD'),
    ],
    ['bad budget month', (d) => (d.budgets[0]!.month = '2026-13')],
    ['overall budget with a category', (d) => (d.budgets[0]!.categoryId = 1)],
    [
      'unknown payment method',
      (d) => ((d.transactions[0] as unknown as Record<string, unknown>).paymentMethod = 'cheque'),
    ],
  ])('rejects invalid structure: %s', (_name, mutate) => {
    expect(errorOf(textWith(mutate))).toBe('invalidStructure');
  });

  it.each<[string, (d: BackupDocument) => void]>([
    ['transaction with an unknown category', (d) => (d.transactions[0]!.categoryId = 99)],
    ['budget on an income category', (d) => (d.budgets[1]!.categoryId = 2)],
    ['duplicate transaction ids', (d) => d.transactions.push({ ...d.transactions[0]! })],
    ['duplicate category keys', (d) => d.categories.push({ ...d.categories[0]!, id: 3 })],
    ['two overall budgets in one month', (d) => d.budgets.push({ ...d.budgets[0]!, id: 3 })],
  ])('rejects inconsistent data: %s', (_name, mutate) => {
    expect(errorOf(textWith(mutate))).toBe('inconsistent');
  });

  it('rejects oversized files before parsing', () => {
    expect(errorOf(' '.repeat(MAX_BACKUP_CHARS + 1))).toBe('tooLarge');
  });

  it('ignores unknown or invalid preferences instead of failing', () => {
    const result = parseBackup(
      textWith((d) => {
        (d.settings as Record<string, unknown>) = {
          uiLanguage: 'ta',
          voiceLanguage: 'hi',
          themeMode: 'neon',
          currency: 'INR',
          profileName: 'x',
        };
      }),
    );
    expect(result.ok && result.backup.settings).toEqual({ voiceLanguage: 'hi', currency: 'INR' });
  });
});
