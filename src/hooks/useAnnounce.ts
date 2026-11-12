import { useEffect } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Speaks `message` with the screen reader whenever it changes to a non-empty value.
 * Android announces `accessibilityLiveRegion` views by itself; iOS has no live regions,
 * so status and error text must be announced explicitly there.
 */
export function useAnnounce(message: string | null | undefined): void {
  useEffect(() => {
    if (message && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
  }, [message]);
}
