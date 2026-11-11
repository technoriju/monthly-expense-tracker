import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { makeStyles } from '@/theme';

import { AppIconButton } from './AppIconButton';
import { AppText } from './AppText';

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  /** Shows a back button. Pass a handler to override `router.back()`. */
  back?: boolean | (() => void);
  right?: ReactNode;
}

/** Consistent screen header: optional back arrow, title (+subtitle), optional right action. */
export function AppHeader({ title, subtitle, back = false, right }: AppHeaderProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const onBack = typeof back === 'function' ? back : () => router.back();

  return (
    <View style={styles.root}>
      {back ? (
        <View style={styles.back}>
          <AppIconButton
            icon={ArrowLeft}
            onPress={onBack}
            accessibilityLabel={t('actions.back')}
            mirrorInRTL
          />
        </View>
      ) : null}
      <View style={styles.titles}>
        <AppText variant="heading2" accessibilityRole="header" numberOfLines={2}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="bodySmall" color="textSecondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    minHeight: t.layout.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    paddingVertical: t.spacing.sm,
  },
  // Align the arrow glyph with the screen gutter; the 48pt touch target extends outward.
  back: { marginStart: -t.spacing.md },
  titles: { flex: 1 },
}));
