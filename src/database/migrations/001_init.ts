import type { Migration } from './types';

/** Initial schema — ARCHITECTURE.md §4.2. */
export const migration001Init: Migration = {
  version: 1,
  name: 'init',
  async up(db) {
    await db.execAsync(`
      CREATE TABLE categories (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        key          TEXT    NOT NULL UNIQUE,
        type         TEXT    NOT NULL CHECK (type IN ('expense','income')),
        icon         TEXT    NOT NULL,
        color        TEXT    NOT NULL,
        sort_order   INTEGER NOT NULL DEFAULT 0,
        is_system    INTEGER NOT NULL DEFAULT 0,
        is_archived  INTEGER NOT NULL DEFAULT 0,
        custom_name  TEXT,
        created_at   INTEGER NOT NULL
      );

      CREATE TABLE transactions (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        type             TEXT    NOT NULL CHECK (type IN ('expense','income')),
        amount_minor     INTEGER NOT NULL CHECK (amount_minor > 0),
        currency         TEXT    NOT NULL,
        category_id      INTEGER NOT NULL REFERENCES categories(id),
        occurred_on      TEXT    NOT NULL,
        note             TEXT,
        source           TEXT    NOT NULL CHECK (source IN ('manual','voice')),
        voice_transcript TEXT,
        created_at       INTEGER NOT NULL,
        updated_at       INTEGER NOT NULL
      );

      CREATE INDEX idx_tx_occurred_on   ON transactions (occurred_on);
      CREATE INDEX idx_tx_type_date     ON transactions (type, occurred_on);
      CREATE INDEX idx_tx_category_date ON transactions (category_id, occurred_on);

      CREATE TABLE settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  },
};
