import { useEffect, useState } from 'react';

import { appLockService } from '../services/appLockService';
import type { AppLockCapabilities } from '../types';

const NO_SECURITY: AppLockCapabilities = {
  hasSecurity: false,
  hasBiometrics: false,
  biometricKind: 'other',
};

/** What the phone supports for unlocking; `null` while it is being checked. */
export function useAppLockCapabilities(): AppLockCapabilities | null {
  const [capabilities, setCapabilities] = useState<AppLockCapabilities | null>(null);
  useEffect(() => {
    let cancelled = false;
    appLockService
      .getCapabilities()
      .then((c) => {
        if (!cancelled) setCapabilities(c);
      })
      .catch(() => {
        if (!cancelled) setCapabilities(NO_SECURITY);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return capabilities;
}
