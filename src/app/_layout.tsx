import '@/i18n';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { TriangleAlert } from 'lucide-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { AppEmptyState, AppScreen, AppToast } from '@/components/ui';
import { useAppBootstrap } from '@/hooks/useAppBootstrap';
import { ThemeProvider, useTheme } from '@/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const status = useAppBootstrap();

  useEffect(() => {
    if (status !== 'loading') void SplashScreen.hideAsync();
  }, [status]);

  // Native splash stays visible while loading.
  if (status === 'loading') return null;

  return (
    <ThemeProvider>
      <StatusBar style="dark" />
      {status === 'error' ? <StartupError /> : <RootNavigator />}
      <AppToast />
    </ThemeProvider>
  );
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
      <Stack.Screen name="settings/language" />
    </Stack>
  );
}

function StartupError() {
  const { t } = useTranslation();
  return (
    <AppScreen scroll={false}>
      <AppEmptyState
        icon={TriangleAlert}
        tone="error"
        title={t('errors.startupTitle')}
        message={t('errors.startupMessage')}
      />
    </AppScreen>
  );
}
