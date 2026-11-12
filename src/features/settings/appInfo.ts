import * as Application from 'expo-application';
import Constants from 'expo-constants';

export interface AppInfo {
  /** User-facing version, e.g. "1.0.0". */
  version: string;
  /** Native build number (Android versionCode / iOS CFBundleVersion), when available. */
  buildVersion: string | null;
}

/** App metadata from the native binary, falling back to app.json (e.g. in Expo Go). */
export function getAppInfo(): AppInfo {
  return {
    version: Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '—',
    buildVersion: Application.nativeBuildVersion,
  };
}
