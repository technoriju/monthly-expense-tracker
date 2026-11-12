/** How the app unlocks. Both methods use the phone's own security; the app stores no secret. */
export const APP_LOCK_METHODS = ['off', 'biometric', 'device'] as const;

export type AppLockMethod = (typeof APP_LOCK_METHODS)[number];

export function isAppLockMethod(value: unknown): value is AppLockMethod {
  return typeof value === 'string' && (APP_LOCK_METHODS as readonly string[]).includes(value);
}

export type BiometricKind = 'fingerprint' | 'face' | 'other';

export interface AppLockCapabilities {
  /** The phone has a screen lock (PIN/pattern/password) or enrolled biometrics. */
  hasSecurity: boolean;
  /** Biometric hardware exists and at least one fingerprint/face is enrolled. */
  hasBiometrics: boolean;
  biometricKind: BiometricKind;
}

export type AuthResult = 'success' | 'cancelled' | 'failed';

/** Returning from the background after longer than this locks the app again. */
export const RELOCK_AFTER_MS = 60_000;
