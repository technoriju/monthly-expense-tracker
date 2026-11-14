import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { AppText } from '@/components/ui';
import { useAdsStore } from '@/store/adsStore';
import { makeStyles } from '@/theme';

import { adsEnabled, getBannerUnitId } from '../adConfig';

type BannerState = 'loading' | 'loaded' | 'failed';

/**
 * Anchored adaptive banner for the bottom of a tab screen. Takes no space until an ad has
 * loaded; on no-fill or network failure it disappears for the rest of the screen's life
 * (no retry loop). Never used on entry, voice, receipt or review screens.
 */
export function AdBanner() {
  const styles = useStyles();
  const { t } = useTranslation();
  const status = useAdsStore((s) => s.status);
  const [state, setState] = useState<BannerState>('loading');

  if (!adsEnabled() || status !== 'ready' || state === 'failed') return null;

  return (
    <View style={state === 'loaded' ? styles.container : null} testID="ad-banner">
      {state === 'loaded' ? (
        <AppText variant="caption" color="textSecondary" align="center">
          {t('ads.label')}
        </AppText>
      ) : null}
      <BannerAd
        unitId={getBannerUnitId()}
        size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={() => setState('loaded')}
        onAdFailedToLoad={() => setState('failed')}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    alignItems: 'center',
    gap: t.spacing.xs,
    paddingTop: t.spacing.xs,
    backgroundColor: t.colors.background,
  },
}));
