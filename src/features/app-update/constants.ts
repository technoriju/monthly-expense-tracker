/** Remote update policy — the single source of truth for update rules (edit it, not the app). */
export const UPDATE_CONFIG_URL = 'https://expensetracker.dlyneed.com/config.json';

/** A slow or captive network must never hold the app up. */
export const FETCH_TIMEOUT_MS = 8_000;

/**
 * A cached "update required" policy keeps blocking offline for this long after the last
 * successful check; older than that, it only suggests the update (never blocks forever).
 */
export const OFFLINE_GRACE_MS = 30 * 24 * 60 * 60 * 1000;

/** Coming back to the foreground re-checks at most this often (always after visiting the store). */
export const FOREGROUND_RECHECK_MS = 15 * 60 * 1000;

/** Keeps the update UI readable whatever the remote file contains. */
export const MAX_RELEASE_NOTES = 10;
export const MAX_TEXT_LENGTH = 200;

/**
 * The gate runs in release builds only: development builds would otherwise be blocked by the
 * live policy whenever their version is below the published minimum. To try it in a debug build,
 * set `EXPO_PUBLIC_UPDATE_GATE_IN_DEV=1` (e.g. in `.env.local`) and restart Metro with `-c`.
 */
export const UPDATE_GATE_ENABLED = !__DEV__ || process.env.EXPO_PUBLIC_UPDATE_GATE_IN_DEV === '1';
