import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Globe } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Pressable,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { AppButton, AppIcon, AppScreen, AppText } from '@/components/ui';
import { AppLockSetupStep } from '@/features/security/components/AppLockSetupStep';
import { useAppLockCapabilities } from '@/features/security/hooks/useAppLockCapabilities';
import { useActiveLanguage } from '@/hooks/useActiveLanguage';
import { makeStyles, useTheme } from '@/theme';

import { useOnboarding } from '../hooks/useOnboarding';
import { ONBOARDING_SLIDES, type OnboardingSlide } from '../slides';

const LOGO = require('../../../../assets/images/logo.png') as number;

/**
 * First-launch walkthrough (reference row 1, col 2): swipeable slides, dots, Next / Get Started,
 * then an optional app-lock step when the phone has a screen lock.
 */
export function OnboardingView() {
  const styles = useStyles();
  const { t } = useTranslation('onboarding');
  const language = useActiveLanguage();
  const { finishing, finish } = useOnboarding();
  const listRef = useRef<FlatList<OnboardingSlide>>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [showLockStep, setShowLockStep] = useState(false);
  const lockCapabilities = useAppLockCapabilities();

  const total = ONBOARDING_SLIDES.length;
  const isLast = index === total - 1;

  function onLayout(e: LayoutChangeEvent) {
    setPageWidth(e.nativeEvent.layout.width);
  }

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (pageWidth > 0) setIndex(Math.round(e.nativeEvent.contentOffset.x / pageWidth));
  }

  /** Slides done or skipped: offer the app lock, or finish when the phone has no lock. */
  function leaveSlides() {
    if (lockCapabilities?.hasSecurity) setShowLockStep(true);
    else void finish();
  }

  function next() {
    if (isLast) {
      leaveSlides();
      return;
    }
    const target = index + 1;
    listRef.current?.scrollToOffset({ offset: target * pageWidth, animated: true });
    setIndex(target);
  }

  if (showLockStep) {
    return <AppLockSetupStep onDone={() => void finish()} finishing={finishing} />;
  }

  return (
    <AppScreen scroll={false} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.push('/settings/language')}
          accessibilityRole="button"
          accessibilityLabel={t('language')}
          style={({ pressed }) => [styles.languageButton, pressed && styles.pressed]}>
          <AppIcon icon={Globe} size="sm" color="primaryText" />
          <AppText variant="bodySmall" color="primaryText" script={language.script}>
            {language.nativeName}
          </AppText>
        </Pressable>
        {isLast ? null : (
          <AppButton label={t('skip')} variant="ghost" size="sm" onPress={leaveSlides} />
        )}
      </View>

      <View style={styles.pager} onLayout={onLayout} testID="onboarding-pager">
        {pageWidth > 0 ? (
          <FlatList
            ref={listRef}
            data={ONBOARDING_SLIDES}
            keyExtractor={(s) => s.id}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScrollEnd}
            getItemLayout={(_, i) => ({ length: pageWidth, offset: pageWidth * i, index: i })}
            renderItem={({ item }) => <Slide slide={item} width={pageWidth} />}
          />
        ) : null}
      </View>

      <View
        style={styles.dots}
        accessible
        accessibilityLabel={t('progress', { current: index + 1, total })}>
        {ONBOARDING_SLIDES.map((s, i) => (
          <View key={s.id} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <AppButton
        label={isLast ? t('getStarted') : t('next')}
        onPress={next}
        loading={finishing}
        fullWidth
        testID="onboarding-next"
      />
    </AppScreen>
  );
}

function Slide({ slide, width }: { slide: OnboardingSlide; width: number }) {
  const styles = useStyles();
  const { colors, layout } = useTheme();
  const { t } = useTranslation('onboarding');
  const Icon = slide.icon;

  return (
    <View style={[styles.slide, { width }]}>
      <View style={styles.art}>
        {Icon ? (
          <Icon
            size={layout.onboardingArtIconSize}
            color={colors.primary}
            strokeWidth={1.75}
            accessible={false}
            importantForAccessibility="no"
          />
        ) : (
          <Image source={LOGO} style={styles.logo} contentFit="contain" accessible={false} />
        )}
      </View>
      <AppText variant="heading1" align="center" accessibilityRole="header">
        {t(`slides.${slide.id}.title`)}
      </AppText>
      <View style={styles.chip}>
        <AppText variant="bodyMedium" color="primaryText" align="center">
          {t(`slides.${slide.id}.chip`)}
        </AppText>
      </View>
      <AppText variant="body" color="textSecondary" align="center">
        {t(`slides.${slide.id}.body`)}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: t.layout.minTouchTarget,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
    minHeight: t.layout.minTouchTarget,
  },
  pressed: { opacity: t.layout.pressedOpacity },
  pager: { flex: 1 },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.lg,
    paddingHorizontal: t.spacing.sm,
  },
  art: {
    width: t.layout.onboardingArtSize,
    height: t.layout.onboardingArtSize,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: t.spacing.lg,
  },
  logo: { width: t.layout.preloaderLogoSize, height: t.layout.preloaderLogoSize },
  chip: {
    backgroundColor: t.colors.primarySoft,
    borderRadius: t.radius.md,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.sm,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: t.spacing.sm,
  },
  dot: {
    width: t.layout.pagerDotSize,
    height: t.layout.pagerDotSize,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.textMuted,
  },
  dotActive: { width: t.layout.pagerDotActiveWidth, backgroundColor: t.colors.primary },
}));
