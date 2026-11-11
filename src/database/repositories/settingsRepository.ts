import { getDatabase } from '../client';

interface SettingRow {
  key: string;
  value: string;
}

function decode(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/**
 * Key/value settings store. Values are JSON-encoded. No business rules here —
 * validation and typing happen in the settings service.
 */
export const settingsRepository = {
  async get(key: string): Promise<unknown> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<SettingRow>(
      'SELECT key, value FROM settings WHERE key = ?',
      [key],
    );
    return row ? decode(row.value) : undefined;
  },

  async getAll(): Promise<Record<string, unknown>> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SettingRow>('SELECT key, value FROM settings');
    return Object.fromEntries(rows.map((r) => [r.key, decode(r.value)]));
  },

  async set(key: string, value: unknown): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, JSON.stringify(value)],
    );
  },
};
