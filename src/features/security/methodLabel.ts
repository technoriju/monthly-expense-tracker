import type { AppLockMethod, BiometricKind } from './types';

/** i18n key (settings namespace) naming a lock method; biometrics are named by kind. */
export function appLockMethodLabelKey(method: AppLockMethod, kind: BiometricKind) {
  if (method === 'biometric') return `appLock.biometric.${kind}` as const;
  return `appLock.${method}` as const;
}
