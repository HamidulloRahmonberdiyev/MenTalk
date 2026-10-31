import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { radii } from '@/theme';

interface Pressable3DProps extends Omit<PressableProps, 'style' | 'children'> {
  children: ReactNode;
  /** Colour of the thick bottom edge under the face. */
  edgeColor: string;
  /** How far the face sits above its edge, and sinks when pressed. */
  depth?: number;
  radius?: number;
  /** Outer box: size, margins, alignment. */
  style?: StyleProp<ViewStyle>;
  /** The face itself: background, padding, layout of the children. */
  faceStyle?: StyleProp<ViewStyle>;
}

/**
 * Duolingo-style chunky control: the face rests on a darker edge and presses down onto it.
 * The outer box keeps its height while pressed, so nothing around it moves.
 */
export function Pressable3D({
  children,
  edgeColor,
  depth = 5,
  radius = radii.md,
  style,
  faceStyle,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: Pressable3DProps) {
  const sink = useSharedValue(0);
  const faceAnimated = useAnimatedStyle(() => ({ transform: [{ translateY: sink.get() }] }));

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPressIn={(event) => {
        sink.set(withTiming(depth, { duration: 60 }));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        sink.set(withTiming(0, { duration: 110 }));
        onPressOut?.(event);
      }}
      style={[{ paddingBottom: depth, borderRadius: radius }, style]}
    >
      <View style={[styles.edge, { top: depth, borderRadius: radius, backgroundColor: edgeColor }]} />
      <Animated.View style={[styles.face, { borderRadius: radius }, faceStyle, faceAnimated]}>{children}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  face: {
    flexGrow: 1,
    overflow: 'hidden',
  },
});
