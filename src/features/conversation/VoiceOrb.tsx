import { Ionicons } from '@expo/vector-icons';
import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { PressableScale } from '@/components/ui/PressableScale';
import { colors, radii, shadows } from '@/theme';
import type { IconName, VoiceState } from '@/types';

const SIZE = 84;
const STAGE = 132;

const ICONS: Record<VoiceState, IconName> = {
  idle: 'mic',
  listening: 'stop',
  thinking: 'ellipsis-horizontal',
  speaking: 'mic',
};

interface VoiceOrbProps {
  state: VoiceState;
  onPress: () => void;
  accessibilityLabel: string;
}

/** Plain round mic button. It stays still; only a soft ripple shows while listening. */
export const VoiceOrb = memo(function VoiceOrb({ state, onPress, accessibilityLabel }: VoiceOrbProps) {
  const ripple = useSharedValue(0);
  const listening = state === 'listening';

  useEffect(() => {
    cancelAnimation(ripple);
    ripple.value = 0;
    if (listening) {
      ripple.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false);
    }
  }, [listening, ripple]);

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: listening ? 0.45 * (1 - ripple.value) : 0,
    transform: [{ scale: 1 + ripple.value * 0.5 }],
  }));

  return (
    <View style={styles.stage}>
      <Animated.View style={[styles.ripple, rippleStyle]} />
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        disabled={state === 'thinking'}
        scaleTo={0.94}
        onPress={onPress}
        style={[styles.button, listening && styles.buttonActive]}
      >
        <Ionicons name={ICONS[state]} size={listening ? 30 : 36} color={colors.onPrimary} />
      </PressableScale>
    </View>
  );
});

const styles = StyleSheet.create({
  stage: { width: STAGE, height: STAGE, alignItems: 'center', justifyContent: 'center' },
  ripple: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    ...shadows.primary,
  },
  buttonActive: { backgroundColor: colors.primaryDark },
});
