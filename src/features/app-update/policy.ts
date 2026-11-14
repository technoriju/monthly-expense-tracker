import { OFFLINE_GRACE_MS } from './constants';
import type { UpdateConfig } from './schema';
import type { PolicySource, UpdateDecision } from './types';
import { compareVersions } from './version';

export interface DecideInput {
  installedVersion: string;
  config: UpdateConfig | null;
  source: PolicySource;
  /** Epoch ms of the successful check that produced `config`. */
  checkedAt: number | null;
  now: number;
  /** `latestVersion` the user already chose "Later" for. */
  dismissedVersion: string | null;
}

/**
 * Update rules (pure):
 * - installed ≥ latest → upToDate.
 * - installed < minimum → mandatory, unless `forceUpdate` is false (then optional) or the
 *   policy is a cached one older than the offline grace period (then optional).
 * - installed < latest → optional (hidden once dismissed for that latest version).
 * - no policy, or a version we can't read → unknown (never block on a bad value).
 */
export function decideUpdate(input: DecideInput): UpdateDecision {
  const { installedVersion, config, source, checkedAt, now, dismissedVersion } = input;
  if (!config || source === 'none') return { status: 'unknown', config: null };

  const vsLatest = compareVersions(installedVersion, config.latestVersion);
  const vsMinimum = compareVersions(installedVersion, config.minimumSupportedVersion);
  if (vsLatest === null || vsMinimum === null) return { status: 'unknown', config };

  if (vsMinimum < 0) {
    const fresh = source === 'fresh' || (checkedAt !== null && now - checkedAt <= OFFLINE_GRACE_MS);
    if (config.forceUpdate !== false && fresh) return { status: 'mandatory', config };
  }

  if (vsLatest >= 0 && vsMinimum >= 0) return { status: 'upToDate', config };
  if (dismissedVersion === config.latestVersion) return { status: 'upToDate', config };
  return { status: 'optional', config };
}
