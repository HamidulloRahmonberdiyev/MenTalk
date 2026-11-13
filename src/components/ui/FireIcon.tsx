import { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import { easing } from '@/theme/motion';

interface FireIconProps {
  size?: number;
  /** A gentle flicker; off when the system asks for reduced motion. */
  animated?: boolean;
}

/**
 * A full-colour flame: a red-to-amber outer tongue, a yellow inner one and a pale hot core, so the
 * streak reads as real fire rather than a flat glyph.
 */
export function FireIcon({ size = 22, animated = true }: FireIconProps) {
  const reduceMotion = useReducedMotion();
  const flicker = useSharedValue(0);

  useEffect(() => {
    if (!animated || reduceMotion) return;
    flicker.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 520, easing: easing.out }),
          withTiming(0.35, { duration: 380, easing: easing.out }),
          withTiming(0.8, { duration: 460, easing: easing.out }),
          withTiming(0, { duration: 540, easing: easing.out }),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(flicker);
  }, [animated, flicker, reduceMotion]);

  // Grows from its base, the way a flame licks upward.
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: -size * 0.6 * flicker.get() * 0.07 },
      { scaleY: 1 + flicker.get() * 0.07 },
      { scaleX: 1 - flicker.get() * 0.03 },
      { rotate: `${(flicker.get() - 0.5) * 4}deg` },
    ],
  }));

  return (
    <Animated.View style={[{ width: size, height: size * 1.2 }, style]}>
      <Svg width={size} height={size * 1.2} viewBox="0 0 32 40">
        <Defs>
          <LinearGradient id="fireOuter" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FF3B2F" />
            <Stop offset="0.45" stopColor="#FF6A1A" />
            <Stop offset="1" stopColor="#FFB020" />
          </LinearGradient>
          <LinearGradient id="fireInner" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFA51F" />
            <Stop offset="0.6" stopColor="#FFD447" />
            <Stop offset="1" stopColor="#FFF1A8" />
          </LinearGradient>
          <RadialGradient id="fireCore" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#FFFDF2" stopOpacity="1" />
            <Stop offset="1" stopColor="#FFF4B8" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Path
          d="M16 1C17.5 7 23 10.5 25.5 15.5C28.5 21.5 28 28 24.5 32.5C21.8 36 18.8 38.5 16 38.5C10 38.5 4.5 34 4.5 26.5C4.5 21.5 7 18 9.5 15.5C9.8 18.5 11 20.5 13 21.5C12 14.5 13.5 7 16 1Z"
          fill="url(#fireOuter)"
        />
        <Path
          d="M16.5 17C17.5 21 21.5 23.5 21.5 28.5C21.5 32.5 19 35.5 16 35.5C12.8 35.5 10.5 33 10.5 29.5C10.5 26.5 12.2 24.5 13.8 23.2C14 25 14.8 26.2 16 26.8C15.3 23.5 15.6 20 16.5 17Z"
          fill="url(#fireInner)"
        />
        <Ellipse cx="16" cy="31" rx="4" ry="4.5" fill="url(#fireCore)" />
      </Svg>
    </Animated.View>
  );
}
