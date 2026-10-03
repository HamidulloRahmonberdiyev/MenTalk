import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing, FadeInDown, FadeInLeft, FadeInRight } from 'react-native-reanimated';

const STAGGER_MS = 70;
const BASE_MS = 90;

interface RevealProps {
  children: ReactNode;
  /** Position in the entrance sequence; later items arrive a beat after earlier ones. */
  index: number;
  /** Slide in sideways, following the direction of navigation, instead of rising up. */
  direction?: 'forward' | 'back';
  style?: StyleProp<ViewStyle>;
}

/** Staggered fade-and-slide entrance so a step assembles itself instead of appearing all at once. */
export function Reveal({ children, index, direction, style }: RevealProps) {
  const builder = direction === 'forward' ? FadeInRight : direction === 'back' ? FadeInLeft : FadeInDown;
  return (
    <Animated.View entering={builder.duration(440).delay(BASE_MS + index * STAGGER_MS).easing(Easing.out(Easing.cubic))} style={style}>
      {children}
    </Animated.View>
  );
}
