import { View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { makeStyles, useTheme } from '@/theme';

import { useVoiceVolume } from '../hooks/useVoiceRecorder';

/** Relative bar heights: a symmetric waveform silhouette like the reference. */
const SHAPE = [
  0.25, 0.4, 0.3, 0.55, 0.45, 0.7, 0.5, 0.85, 0.6, 1, 0.75, 0.9, 0.75, 1, 0.6, 0.85, 0.5, 0.7, 0.45,
  0.55, 0.3, 0.4, 0.25,
];
const MIN_RATIO = 0.12;
/** Engine volume range is about −2 (silence) … 10 (loud). */
const VOLUME_MIN = -2;
const VOLUME_MAX = 10;

export interface WaveformProps {
  /** Engine volume level; ignored when `active` is false. */
  volume: number;
  active: boolean;
}

/** Level shown while listening when the user asked the system to reduce motion. */
const STATIC_LEVEL = 0.6;

/** The waveform bound to the live recording volume. */
export function LiveWaveform({ active }: { active: boolean }) {
  const volume = useVoiceVolume();
  return <Waveform volume={volume} active={active} />;
}

/**
 * Volume-driven bar waveform. Flat and muted while not listening; a still silhouette when
 * reduced motion is on. Decorative only.
 */
export function Waveform({ volume, active }: WaveformProps) {
  const styles = useStyles();
  const { layout } = useTheme();
  const reduceMotion = useReducedMotion();
  const level = !active
    ? 0
    : reduceMotion
      ? STATIC_LEVEL
      : Math.min(1, Math.max(0, (volume - VOLUME_MIN) / (VOLUME_MAX - VOLUME_MIN)));

  return (
    <View
      style={styles.root}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {SHAPE.map((ratio, i) => {
        const scaled = MIN_RATIO + (1 - MIN_RATIO) * ratio * Math.max(level, MIN_RATIO);
        return (
          <View
            key={i}
            style={[
              styles.bar,
              active ? styles.barActive : styles.barIdle,
              { height: layout.waveformHeight * scaled },
            ]}
          />
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    height: t.layout.waveformHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.xs,
  },
  bar: { width: t.layout.waveformBarWidth, borderRadius: t.radius.pill },
  barActive: { backgroundColor: t.colors.primary },
  barIdle: { backgroundColor: t.colors.primarySoft },
}));
