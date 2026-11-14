import * as Application from 'expo-application';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import type { UpdateConfig } from '../schema';

/**
 * Store page for this platform: the configured URL, or on Android the Play listing built from
 * the package name. iOS needs the App Store id, so without `storeUrlIOS` there is no link.
 */
export function getStoreUrl(config: UpdateConfig | null): string | null {
  if (Platform.OS === 'ios') return config?.storeUrlIOS ?? null;
  if (Platform.OS === 'android') {
    if (config?.storeUrlAndroid) return config.storeUrlAndroid;
    const id = Application.applicationId;
    return id ? `https://play.google.com/store/apps/details?id=${id}` : null;
  }
  return null;
}

export type OpenStoreResult = 'opened' | 'unavailable';

/** Opens the store listing. The user installs the update there — the app can't install it. */
export async function openStore(config: UpdateConfig | null): Promise<OpenStoreResult> {
  const url = getStoreUrl(config);
  if (!url) return 'unavailable';
  try {
    await Linking.openURL(url);
    return 'opened';
  } catch {
    return 'unavailable';
  }
}
