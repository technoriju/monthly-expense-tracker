import { getNetworkStateAsync } from 'expo-network';

/**
 * True only when the OS reports no internet (reads local state; makes no request).
 * An unknown state counts as online — the recognizer then reports its own errors.
 */
export async function isDeviceOffline(): Promise<boolean> {
  try {
    const { isConnected, isInternetReachable } = await getNetworkStateAsync();
    return isConnected === false || isInternetReachable === false;
  } catch {
    return false;
  }
}
