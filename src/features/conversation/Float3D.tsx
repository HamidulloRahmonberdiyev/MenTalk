import { useEffect, type ReactNode } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface Float3DProps {
  active: boolean;
  children: ReactNode;
}

export function Float3D({ active, children }: Float3DProps) {
  const phase = useSharedValue(0);
  const intensity = useSharedValue(0.5);

  useEffect(() => {
    phase.value = withRepeat(withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [phase]);

  useEffect(() => {
    intensity.value = withTiming(active ? 1 : 0.5, { duration: 400 });
  }, [active, intensity]);

  const style = useAnimatedStyle(() => {
    const swing = (phase.value - 0.5) * 2;
    return {
      transform: [
        { perspective: 800 },
        { translateY: swing * 5 * intensity.value },
        { rotateY: `${swing * 9 * intensity.value}deg` },
        { rotateX: `${-swing * 3 * intensity.value}deg` },
      ],
    };
  });

  return <Animated.View style={style}>{children}</Animated.View>;
}
