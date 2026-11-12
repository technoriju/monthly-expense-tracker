import '@/i18n';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { TriangleAlert } from 'lucide-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { AppEmptyState, AppScreen, AppToast } from '@/components/ui';
import { useAppBootstrap } from '@/hooks/useAppBootstrap';
import { ThemeProvider, useTheme } from '@/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { status, retry } = useAppBootstrap();

  useEffect(() => {
    if (status !== 'loading') void SplashScreen.hideAsync();
  }, [status]);

  // Native splash stays visible while loading.
  if (status === 'loading') return null;

  return (
    <ThemeProvider>
      <SystemBars />
      {status === 'error' ? <StartupError onRetry={retry} /> : <RootNavigator />}
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

function RootNavigator() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="transaction/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="transaction/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="transactions" />
      <Stack.Screen name="reports/categories" />
      <Stack.Screen name="reports/calendar" />
      <Stack.Screen name="budgets" />
      <Stack.Screen name="voice/review" />
      <Stack.Screen name="settings/language" />
      <Stack.Screen name="settings/theme" />
      <Stack.Screen name="settings/voice" />
      <Stack.Screen name="settings/backup" />
      <Stack.Screen name="settings/restore" />
      <Stack.Screen name="settings/export" />
      <Stack.Screen name="settings/about" />
      <Stack.Screen name="settings/privacy" />
      <Stack.Screen name="settings/licenses" />
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
