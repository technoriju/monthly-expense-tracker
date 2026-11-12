import { migration001Init } from './001_init';
import { migration002TransactionsV2 } from './002_transactions_v2';
import { migration003Budgets } from './003_budgets';
import { migration004AmountGuards } from './004_amount_guards';
import type { Migration } from './types';

/** Ordered, append-only list of schema migrations. */
export const MIGRATIONS: readonly Migration[] = [
  migration001Init,
  migration002TransactionsV2,
  migration003Budgets,
  migration004AmountGuards,
];

export type { Migration, MigrationExecutor } from './types';
