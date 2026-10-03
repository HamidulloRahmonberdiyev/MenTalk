import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  Keyframe,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, radii } from '@/theme';

const SIZE = 108;
const EASE_OUT = Easing.out(Easing.cubic);

/** New emoji drifts in with a soft tilt; the old one shrinks away underneath it. */
const EMOJI_ENTER = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.62 }, { rotate: '-14deg' }, { translateY: 10 }] },
  100: { opacity: 1, transform: [{ scale: 1 }, { rotate: '0deg' }, { translateY: 0 }], easing: EASE_OUT },
})
  .duration(520)
  .delay(110);

const EMOJI_EXIT = new Keyframe({
  0: { opacity: 1, transform: [{ scale: 1 }] },
  100: { opacity: 0, transform: [{ scale: 0.78 }], easing: Easing.in(Easing.quad) },
}).duration(190);

const WAVE_DEGREES = [0, 16, -6, 13, -4, 0] as const;

/**
 * The icon at the top of each sign-up step. It is one persistent tile: it floats gently, breathes a
 * soft halo, and morphs between emojis instead of being rebuilt for every step.
 */
export const StepHero = memo(function StepHero({ emoji }: { emoji: string }) {
  const float = useSharedValue(0);
  const halo = useSharedValue(0);
  const wave = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.sin) }), -1, true);
    halo.value = withRepeat(withTiming(1, { duration: 2800, easing: Easing.out(Easing.quad) }), -1, false);
  }, [float, halo]);

  // Small, emoji-specific gestures: the hand waves, the flame breathes.
  useEffect(() => {
    cancelAnimation(wave);
    cancelAnimation(pulse);
    wave.value = 0;
    pulse.value = 0;

    if (emoji === '👋') {
      const step = 170;
      wave.value = withDelay(
        650,
        withRepeat(
          withSequence(
            ...WAVE_DEGREES.map((degrees) => withTiming(degrees, { duration: step, easing: Easing.inOut(Easing.quad) })),
            withDelay(3600, withTiming(0, { duration: 1 })),
          ),
          -1,
        ),
      );
    } else if (emoji === '🔥') {
      pulse.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
    }
  }, [emoji, wave, pulse]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (float.value - 0.5) * 9 }, { rotate: `${(float.value - 0.5) * 2.4}deg` }],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.42 * (1 - halo.value),
    transform: [{ scale: 1 + halo.value * 0.42 }],
  }));

  const gestureStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wave.value}deg` }, { scale: 1 + pulse.value * 0.07 }],
  }));

  return (
    <Animated.View style={[styles.wrap, floatStyle]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.halo, haloStyle]} />
      <View style={styles.tile}>
        <Animated.View style={[styles.gesture, gestureStyle]}>
          <Animated.Text key={emoji} entering={EMOJI_ENTER} exiting={EMOJI_EXIT} style={styles.emoji}>
            {emoji}
          </Animated.Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center', width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  tile: {
    width: SIZE,
    height: SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    boxShadow: '0 14px 34px rgba(42, 171, 238, 0.26)',
  },
  gesture: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', transformOrigin: '70% 82%' },
  emoji: { position: 'absolute', fontSize: 54, lineHeight: 66, textAlign: 'center' },
});
