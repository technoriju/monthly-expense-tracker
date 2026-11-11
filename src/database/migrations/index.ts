import { migration001Init } from './001_init';
import type { Migration } from './types';

/** Ordered, append-only list of schema migrations. */
export const MIGRATIONS: readonly Migration[] = [migration001Init];

export type { Migration, MigrationExecutor } from './types';
