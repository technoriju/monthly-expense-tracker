import * as LocalAuthentication from 'expo-local-authentication';

import type { AppLockCapabilities, AuthResult, BiometricKind } from '../types';

const CANCEL_ERRORS = new Set(['user_cancel', 'system_cancel', 'app_cancel']);

/** Thin wrapper over the OS authentication prompt. Never logs anything. */
export const appLockService = {
  async getCapabilities(): Promise<AppLockCapabilities> {
    const [level, hasHardware, isEnrolled, types] = await Promise.all([
      LocalAuthentication.getEnrolledLevelAsync(),
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    return {
      hasSecurity: level !== LocalAuthentication.SecurityLevel.NONE,
      hasBiometrics: hasHardware && isEnrolled,
      biometricKind: toBiometricKind(types),
    };
  },

  /** Shows the system prompt (biometrics with the phone's PIN/pattern/password as fallback). */
  async authenticate(promptMessage: string, cancelLabel: string): Promise<AuthResult> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel,
        disableDeviceFallback: false,
      });
      if (result.success) return 'success';
      return CANCEL_ERRORS.has(result.error) ? 'cancelled' : 'failed';
    } catch {
      return 'failed';
    }
  },
};

function toBiometricKind(types: LocalAuthentication.AuthenticationType[]): BiometricKind {
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'fingerprint';
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'face';
  return 'other';
}
