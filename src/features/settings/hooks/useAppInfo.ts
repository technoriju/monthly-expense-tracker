import { getAppInfo } from '../appInfo';

/** Static app metadata (version, build). */
export function useAppInfo() {
  return getAppInfo();
}
