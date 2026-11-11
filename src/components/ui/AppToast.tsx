import { CircleCheck, TriangleAlert } from 'lucide-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUiStore } from '@/store/uiStore';
import { makeStyles, useTheme } from '@/theme';

import { AppIcon } from './AppIcon';
import { AppText } from './AppText';

const TOAST_DURATION_MS = 2500;

/** Global, non-blocking feedback message. Mounted once in the root layout. */
export function AppToast() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { layout } = useTheme();
  const toast = useUiStore((s) => s.toast);
  const hideToast = useUiStore((s) => s.hideToast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => hideToast(toast.id), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast, hideToast]);

  if (!toast) return null;
  const isError = toast.tone === 'error';

  return (
    <View
      pointerEvents="none"
      style={[styles.root, { bottom: insets.bottom + layout.tabBarHeight + layout.toastOffset }]}
      accessibilityLiveRegion="polite"
      accessibilityRole={isError ? 'alert' : 'text'}>
      <View style={styles.toast}>
        <AppIcon
          icon={isError ? TriangleAlert : CircleCheck}
          size="md"
          color={isError ? 'expense' : 'income'}
        />
        <AppText variant="bodyMedium" color="onPrimary" style={styles.text}>
          {toast.message}
        </AppText>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    position: 'absolute',
    start: t.layout.screenGutter,
    end: t.layout.screenGutter,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    maxWidth: t.layout.maxContentWidth,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
    borderRadius: t.radius.lg,
    backgroundColor: t.colors.textPrimary,
    ...t.shadows.card,
  },
  text: { flexShrink: 1 },
}));
