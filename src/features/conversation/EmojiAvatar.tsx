import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, radii } from '@/theme';

interface EmojiAvatarProps {
  emoji: string;
  size: number;
  speaking: boolean;
}

/** The tutor: an emoji that floats gently, bounces while talking and pops whenever its emotion changes. */
export const EmojiAvatar = memo(function EmojiAvatar({ emoji, size, speaking }: EmojiAvatarProps) {
  const float = useSharedValue(0);
  const talk = useSharedValue(0);
  const pop = useSharedValue(1);
  const halo = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [float]);

  useEffect(() => {
    cancelAnimation(talk);
    cancelAnimation(halo);
    if (speaking) {
      talk.value = withRepeat(withTiming(1, { duration: 190, easing: Easing.inOut(Easing.quad) }), -1, true);
      halo.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }), -1, false);
    } else {
      talk.value = withTiming(0, { duration: 200 });
      halo.value = withTiming(0, { duration: 200 });
    }
  }, [speaking, talk, halo]);

  useEffect(() => {
    pop.value = withSequence(
      withTiming(0.82, { duration: 90 }),
      withSpring(1, { damping: 7, stiffness: 220 }),
    );
  }, [emoji, pop]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: (float.value - 0.5) * 10 - talk.value * 6 },
      { rotate: `${(talk.value - 0.5) * (speaking ? 8 : 0)}deg` },
      { scale: pop.value * (1 + talk.value * 0.05) },
    ],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: speaking ? 0.5 * (1 - halo.value) : 0,
    transform: [{ scale: 1 + halo.value * 0.35 }],
  }));

  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.circle, { borderRadius: radii.pill }, haloStyle]} />
      <Animated.View style={[styles.circle, styles.face, bodyStyle]}>
        <Animated.Text style={{ fontSize: size * 0.56, lineHeight: size * 0.7, textAlign: 'center' }}>{emoji}</Animated.Text>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  circle: {
    ...StyleSheet.absoluteFill,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  face: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    boxShadow: '0 14px 34px rgba(42, 171, 238, 0.28)',
  },
});
