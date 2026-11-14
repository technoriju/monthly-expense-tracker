import { settingsRepository } from '@/database';
import { SETTING_KEYS } from '@/features/settings/types';

import { FETCH_TIMEOUT_MS, UPDATE_CONFIG_URL } from '../constants';
import { parseUpdateConfig, type UpdateConfig } from '../schema';
import type { CachedPolicy, UpdateCheckError } from '../types';

export type FetchResult =
  { ok: true; config: UpdateConfig } | { ok: false; error: UpdateCheckError };

let inFlight: Promise<FetchResult> | null = null;

async function request(): Promise<FetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    // Anonymous GET: no user data or ids are sent. Android's networking layer keeps an HTTP disk
    // cache and ignores `cache: 'no-store'`, so a changing query string plus no-cache headers make
    // sure every check reaches the server instead of reusing an old copy of the file.
    const response = await fetch(`${UPDATE_CONFIG_URL}?t=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, error: response.status >= 500 ? 'offline' : 'invalid' };
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return { ok: false, error: 'invalid' };
    }
    const config = parseUpdateConfig(body);
    return config ? { ok: true, config } : { ok: false, error: 'invalid' };
  } catch {
    // Network failure, DNS, TLS or timeout (abort).
    return { ok: false, error: 'offline' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Remote update policy + its local cache. Touches only two keys in the `settings` table —
 * never transactions, budgets, categories or receipts.
 */
export const updateConfigService = {
  /** Fetches and validates the remote policy. Never throws; concurrent calls share one request. */
  fetchRemote(): Promise<FetchResult> {
    if (!inFlight) {
      inFlight = request().finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  },

  /** Last successfully fetched policy, re-validated; null when missing or corrupt. */
  async loadCache(): Promise<CachedPolicy | null> {
    try {
      const raw = await settingsRepository.get(SETTING_KEYS.updatePolicyCache);
      if (typeof raw !== 'object' || raw === null) return null;
      const { config, checkedAt } = raw as { config?: unknown; checkedAt?: unknown };
      const parsed = parseUpdateConfig(config);
      if (!parsed || typeof checkedAt !== 'number' || !Number.isFinite(checkedAt)) return null;
      return { config: parsed, checkedAt };
    } catch {
      return null;
    }
  },

  async saveCache(policy: CachedPolicy): Promise<void> {
    await settingsRepository.set(SETTING_KEYS.updatePolicyCache, policy);
  },

  async loadDismissedVersion(): Promise<string | null> {
    try {
      const raw = await settingsRepository.get(SETTING_KEYS.updateDismissedVersion);
      return typeof raw === 'string' ? raw : null;
    } catch {
      return null;
    }
  },

  async saveDismissedVersion(version: string): Promise<void> {
    await settingsRepository.set(SETTING_KEYS.updateDismissedVersion, version);
  },
};
