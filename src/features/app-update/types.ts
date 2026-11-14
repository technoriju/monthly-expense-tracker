import type { UpdateConfig } from './schema';

/**
 * - upToDate: nothing to do.
 * - optional: a newer version exists; the user may continue.
 * - mandatory: this version is no longer supported; the app is blocked until updated.
 * - unknown: no usable policy (first launch offline, invalid file) — the app works normally.
 */
export type UpdateStatus = 'upToDate' | 'optional' | 'mandatory' | 'unknown';

export type PolicySource = 'fresh' | 'cache' | 'none';

export interface UpdateDecision {
  status: UpdateStatus;
  config: UpdateConfig | null;
}

/** Why the last remote check failed: no connection / timeout, or a file the app can't use. */
export type UpdateCheckError = 'offline' | 'invalid';

export interface CachedPolicy {
  config: UpdateConfig;
  /** Epoch ms of the successful check that produced `config`. */
  checkedAt: number;
}
