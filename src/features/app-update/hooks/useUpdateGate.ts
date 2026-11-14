import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { getAppInfo } from '@/features/settings/appInfo';

import { FOREGROUND_RECHECK_MS, UPDATE_GATE_ENABLED } from '../constants';
import { decideUpdate } from '../policy';
import type { UpdateConfig } from '../schema';
import { openStore as openStoreListing } from '../services/storeService';
import { updateConfigService } from '../services/updateConfigService';
import type { PolicySource, UpdateCheckError, UpdateDecision } from '../types';

interface Policy {
  config: UpdateConfig | null;
  source: PolicySource;
  checkedAt: number | null;
}

const NO_POLICY: Policy = { config: null, source: 'none', checkedAt: null };
const UNKNOWN: UpdateDecision = { status: 'unknown', config: null };

export interface UpdateGate extends UpdateDecision {
  /** A remote check is running. */
  checking: boolean;
  /** Why the last check failed, until the next successful one. */
  error: UpdateCheckError | null;
  /** The store could not be opened (no link configured, or no store app). */
  storeUnavailable: boolean;
  retry: () => void;
  openStore: () => void;
  /** "Later" on the optional prompt: stays quiet until a newer latest version is published. */
  dismiss: () => void;
}

/**
 * Update gate for the root layout. Starts once bootstrap is ready (database open): decides from
 * the cached policy right away, so startup never waits on the network, then refreshes it in the
 * background. Re-checks on return to the foreground (always after a store visit).
 */
export function useUpdateGate(ready: boolean): UpdateGate {
  const [decision, setDecision] = useState<UpdateDecision>(UNKNOWN);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<UpdateCheckError | null>(null);
  const [storeUnavailable, setStoreUnavailable] = useState(false);
  const policy = useRef<Policy>(NO_POLICY);
  const dismissed = useRef<string | null>(null);
  const lastAttemptAt = useRef(0);
  const visitedStore = useRef(false);
  const mounted = useRef(true);
  const enabled = ready && UPDATE_GATE_ENABLED;

  const apply = useCallback(() => {
    if (!mounted.current) return;
    setDecision(
      decideUpdate({
        installedVersion: getAppInfo().version,
        ...policy.current,
        now: Date.now(),
        dismissedVersion: dismissed.current,
      }),
    );
  }, []);

  const check = useCallback(async () => {
    lastAttemptAt.current = Date.now();
    setChecking(true);
    const result = await updateConfigService.fetchRemote();
    if (!mounted.current) return;
    if (result.ok) {
      const checkedAt = Date.now();
      policy.current = { config: result.config, source: 'fresh', checkedAt };
      setError(null);
      setStoreUnavailable(false);
      try {
        await updateConfigService.saveCache({ config: result.config, checkedAt });
      } catch {
        // Not cached this time; the fresh policy still applies for this session.
      }
    } else {
      // Keep whatever policy we already have (cached or fresh from earlier in this session).
      setError(result.error);
    }
    apply();
    if (mounted.current) setChecking(false);
  }, [apply]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      const [cached, dismissedVersion] = await Promise.all([
        updateConfigService.loadCache(),
        updateConfigService.loadDismissedVersion(),
      ]);
      if (cancelled) return;
      dismissed.current = dismissedVersion;
      if (cached) policy.current = { ...cached, source: 'cache' };
      apply();
      await check();
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, apply, check]);

  useEffect(() => {
    if (!enabled) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      if (visitedStore.current || Date.now() - lastAttemptAt.current > FOREGROUND_RECHECK_MS) {
        visitedStore.current = false;
        void check();
      }
    });
    return () => sub.remove();
  }, [enabled, check]);

  const retry = useCallback(() => {
    void check();
  }, [check]);

  const openStore = useCallback(() => {
    void openStoreListing(policy.current.config).then((result) => {
      if (!mounted.current) return;
      visitedStore.current = result === 'opened';
      setStoreUnavailable(result === 'unavailable');
    });
  }, []);

  const dismiss = useCallback(() => {
    const latest = policy.current.config?.latestVersion;
    if (!latest) return;
    dismissed.current = latest;
    apply();
    updateConfigService.saveDismissedVersion(latest).catch(() => {
      // Only means the prompt may show again next launch.
    });
  }, [apply]);

  return {
    ...(enabled ? decision : UNKNOWN),
    checking,
    error,
    storeUnavailable,
    retry,
    openStore,
    dismiss,
  };
}
