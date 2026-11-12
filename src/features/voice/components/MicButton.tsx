import { Mic, Square } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AppIcon } from '@/components/ui';
import { makeStyles, useTheme } from '@/theme';

export interface MicButtonProps {
  listening: boolean;
  disabled?: boolean;
  onPress: () => void;
  /** Already-translated label describing what a press does. */
  accessibilityLabel: string;
}

const PULSE_MS = 1400;
const PULSE_SCALE = 1.25;

/**
 * Large circular microphone (design-reference row 1, col 5) inside soft concentric rings.
 * While listening the outer ring pulses (skipped when the OS asks for reduced motion) and
 * the icon becomes a stop square.
 */
export function MicButton({
  listening,
  disabled = false,
  onPress,
  accessibilityLabel,
}: MicButtonProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (listening && !reduceMotion) {
      pulse.value = withRepeat(
        withTiming(1, { duration: PULSE_MS, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = 0;
    }
  }, [listening, reduceMotion, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: listening ? 1 - pulse.value : 0,
    transform: [{ scale: 1 + (PULSE_SCALE - 1) * pulse.value }],
  }));

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.ring, styles.pulse, pulseStyle]} pointerEvents="none" />
      <View style={[styles.ring, listening && styles.ringActive]} pointerEvents="none" />
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        style={({ pressed }) => [
          styles.button,
          pressed && { backgroundColor: colors.primaryPressed },
          disabled && styles.disabled,
        ]}>
        <AppIcon icon={listening ? Square : Mic} size="xxl" color="onPrimary" />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    width: t.layout.micRingSize,
    height: t.layout.micRingSize,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  ring: {
    position: 'absolute',
    width: t.layout.micRingSize,
    height: t.layout.micRingSize,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.primarySoft,
  },
  ringActive: { borderWidth: t.layout.borderWidth, borderColor: t.colors.primary },
  pulse: { backgroundColor: t.colors.primarySoft },
  button: {
    width: t.layout.micButtonSize,
    height: t.layout.micButtonSize,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...t.shadows.raised,
  },
  disabled: { opacity: t.layout.disabledOpacity },
}));
