import Constants from 'expo-constants';

/** Static app metadata from app.json. */
export function useAppInfo() {
  return { version: Constants.expoConfig?.version ?? '—' };
}
