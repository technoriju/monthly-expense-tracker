import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { i18n } from '@/i18n';
import { layout, lightColors, spacing } from '@/theme';

const LOGO = require('../../../assets/images/logo.png') as number;

/**
 * Startup preloader: brand purple with the app logo centred. Rendered before settings are
 * hydrated (outside ThemeProvider), so it uses the fixed light brand colors — the same purple
 * as the native splash, so the hand-off is seamless.
 */
export function Preloader() {
  return (
    <View style={styles.root} testID="preloader">
      <StatusBar style="light" />
      <Image
        source={LOGO}
        style={styles.logo}
        contentFit="contain"
        accessible
        accessibilityRole="image"
        accessibilityLabel={i18n.t('appName')}
      />
      <ActivityIndicator color={lightColors.onPrimary} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: lightColors.primary,
  },
  logo: { width: layout.preloaderLogoSize, height: layout.preloaderLogoSize },
  spinner: { marginTop: spacing.xxxl },
});
