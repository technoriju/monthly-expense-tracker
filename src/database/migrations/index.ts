import { migration001Init } from './001_init';
import { migration002TransactionsV2 } from './002_transactions_v2';
import type { Migration } from './types';

/** Ordered, append-only list of schema migrations. */
export const MIGRATIONS: readonly Migration[] = [migration001Init, migration002TransactionsV2];

export type { Migration, MigrationExecutor } from './types';
