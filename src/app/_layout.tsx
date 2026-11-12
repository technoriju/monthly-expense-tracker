import '@/i18n';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { TriangleAlert } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Preloader } from '@/components/layout/Preloader';
import { AppEmptyState, AppScreen, AppToast } from '@/components/ui';
import { LockScreen } from '@/features/security/components/LockScreen';
import { useAppLock } from '@/features/security/hooks/useAppLock';
import { useAppBootstrap } from '@/hooks/useAppBootstrap';
import { useSettingsStore } from '@/store/settingsStore';
import { ThemeProvider, useTheme } from '@/theme';

void SplashScreen.preventAutoHideAsync();

/** Minimum time the logo preloader stays up, so it reads as a screen rather than a flash. */
const PRELOADER_MIN_MS = 1200;

export default function RootLayout() {
  const { status, retry } = useAppBootstrap();
  const preloaderElapsed = useElapsed(PRELOADER_MIN_MS);
  const lock = useAppLock(status === 'ready');

  // The JS preloader (same purple + logo) takes over from the native splash right away.
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  if (status === 'loading' || !preloaderElapsed) return <Preloader />;

  return (
    <ThemeProvider>
      <SystemBars />
      {status === 'error' ? (
        <StartupError onRetry={retry} />
      ) : (
        // While locked, the cover sits on top so navigation state survives; the app underneath
        // is hidden from screen readers.
        <View
          style={layoutStyles.fill}
          accessibilityElementsHidden={lock.locked}
          importantForAccessibility={lock.locked ? 'no-hide-descendants' : 'auto'}>
          <RootNavigator />
        </View>
      )}
      {status !== 'error' && lock.locked ? (
        <LockScreen
          method={lock.method}
          authenticating={lock.authenticating}
          onUnlock={() => void lock.unlock()}
        />
      ) : null}
      <AppToast />
    </ThemeProvider>
  );
}

/** Status bar icons and the native root background follow the active theme. */
function SystemBars() {
  const { scheme, colors } = useTheme();
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {
      // Cosmetic only (visible during transitions); ignore failures.
    });
  }, [colors.background]);
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}

function useElapsed(ms: number): boolean {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setElapsed(true), ms);
    return () => clearTimeout(id);
  }, [ms]);
  return elapsed;
}

function RootNavigator() {
  const { colors } = useTheme();
  const onboardingDone = useSettingsStore((s) => s.onboardingDone);
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      {/* First launch only: onboarding until finished or skipped, then straight to the tabs. */}
      <Stack.Protected guard={onboardingDone} redirectTo="/onboarding">
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!onboardingDone} redirectTo="/">
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Screen name="transaction/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="transaction/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="transactions" />
      <Stack.Screen name="reports/categories" />
      <Stack.Screen name="reports/calendar" />
      <Stack.Screen name="budgets" />
      <Stack.Screen name="voice/review" />
      <Stack.Screen name="categories" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="settings/language" />
      <Stack.Screen name="settings/theme" />
      <Stack.Screen name="settings/voice" />
      <Stack.Screen name="settings/backup" />
      <Stack.Screen name="settings/restore" />
      <Stack.Screen name="settings/export" />
      <Stack.Screen name="settings/about" />
      <Stack.Screen name="settings/privacy" />
      <Stack.Screen name="settings/licenses" />
      <Stack.Screen name="settings/app-lock" />
      <Stack.Screen name="help" />
    </Stack>
  );
}

function StartupError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <AppScreen scroll={false}>
      <AppEmptyState
        icon={TriangleAlert}
        tone="error"
        title={t('errors.startupTitle')}
        message={t('errors.startupMessage')}
        action={{ label: t('errors.retry'), onPress: onRetry }}
      />
    </AppScreen>
  );
}

const layoutStyles = StyleSheet.create({ fill: { flex: 1 } });
