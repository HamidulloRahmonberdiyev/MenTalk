import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { colors } from '@/theme';

import { AIFace } from './AIFace';
import type { AIFaceProps, FaceState } from './types';

/** Body proportions relative to `size` (the mascot's width). */
const BODY_ASPECT = 0.84;
const FACE_WIDTH = 0.8;

/** Glow strength and speed per state; the halo is what makes the mascot feel awake. */
const GLOW: Record<FaceState, { opacity: number; scale: number; period: number }> = {
  idle: { opacity: 0.4, scale: 1, period: 2800 },
  listening: { opacity: 0.85, scale: 1.1, period: 1100 },
  thinking: { opacity: 0.55, scale: 1.04, period: 1500 },
  speaking: { opacity: 0.7, scale: 1.07, period: 900 },
  happy: { opacity: 0.8, scale: 1.1, period: 1400 },
  encouraging: { opacity: 0.7, scale: 1.08, period: 1400 },
  wink: { opacity: 0.7, scale: 1.08, period: 1400 },
  surprised: { opacity: 0.9, scale: 1.14, period: 1000 },
};

const POP_STATES: readonly FaceState[] = ['happy', 'encouraging', 'wink', 'surprised'];

export interface AIMascotProps extends AIFaceProps {
  /** Mascot width in px. The face is drawn inside it. */
  size?: number;
}

/**
 * The assistant's identity: a soft white, rounded little robot with a blue glow and an expressive {@link AIFace}.
 * The body adds the big motion (float, lean, pop, glow); the face handles eyes, brows and mouth.
 *
 *   <AIMascot state="speaking" emotion="happy" audioLevel={level} size={180} />
 */
export const AIMascot = memo(function AIMascot({ state, emotion = 'neutral', audioLevel, size = 180, color, style }: AIMascotProps) {
  const float = useSharedValue(0);
  const glow = useSharedValue(0);
  const lean = useSharedValue(0);
  const pop = useSharedValue(0);

  const bodyWidth = size;
  const bodyHeight = size * BODY_ASPECT;
  const target = GLOW[state];

  useEffect(() => {
    float.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [float]);

  useEffect(() => {
    cancelAnimation(glow);
    glow.value = 0;
    glow.value = withRepeat(withTiming(1, { duration: target.period, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [glow, target.period]);

  // Leaning the head to one side reads as "thinking"; everything else settles back upright.
  useEffect(() => {
    lean.value = withSpring(state === 'thinking' ? 1 : state === 'wink' ? -0.6 : 0, { damping: 12, stiffness: 90 });
    if (POP_STATES.includes(state)) {
      pop.value = withSequence(withTiming(1, { duration: 160, easing: Easing.out(Easing.cubic) }), withSpring(0, { damping: 7, stiffness: 140 }));
    }
  }, [state, lean, pop]);

  const level: SharedValue<number> | null = typeof audioLevel === 'object' ? audioLevel : null;

  const bodyStyle = useAnimatedStyle(() => {
    const talk = state === 'speaking' && level ? level.value : 0;
    return {
      transform: [
        { translateY: (float.value - 0.5) * -10 - pop.value * 10 },
        { rotate: `${lean.value * 4}deg` },
        { scale: 1 + pop.value * 0.06 + talk * 0.025 + (state === 'listening' ? glow.value * 0.015 : 0) },
      ],
    };
  });

  const haloStyle = useAnimatedStyle(() => ({
    opacity: target.opacity * (0.65 + glow.value * 0.35),
    transform: [{ scale: 1 + (target.scale - 1) * glow.value }],
  }));

  // The contact shadow shrinks and fades as the mascot floats up, which sells the depth.
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: 0.32 - float.value * 0.12 - pop.value * 0.08,
    transform: [{ scaleX: 1 - float.value * 0.14 - pop.value * 0.1 }],
  }));

  return (
    <View
      style={[{ width: bodyWidth * 1.5, height: bodyHeight * 1.5, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          { width: bodyWidth * 1.18, height: bodyHeight * 1.18, borderRadius: bodyWidth * 0.5, boxShadow: `0 0 ${size * 0.34}px ${size * 0.06}px rgba(42, 171, 238, 0.55)` },
          haloStyle,
        ]}
      />

      <Animated.View
        pointerEvents="none"
        style={[styles.shadow, { width: bodyWidth * 0.7, height: size * 0.07, bottom: bodyHeight * 0.06, borderRadius: size }, shadowStyle]}
      />

      <Animated.View style={[{ width: bodyWidth, height: bodyHeight }, bodyStyle]}>
        {/* Side "ear" pods give the silhouette a character instead of a plain blob. */}
        <View style={[styles.ear, { left: -size * 0.025, top: bodyHeight * 0.38, width: size * 0.08, height: bodyHeight * 0.26 }]} />
        <View style={[styles.ear, { right: -size * 0.025, top: bodyHeight * 0.38, width: size * 0.08, height: bodyHeight * 0.26 }]} />

        <LinearGradient
          colors={['#FFFFFF', '#F3FAFE', '#D9EDF9']}
          locations={[0, 0.55, 1]}
          start={{ x: 0.25, y: 0 }}
          end={{ x: 0.75, y: 1 }}
          style={[
            styles.body,
            {
              borderRadius: bodyHeight * 0.44,
              boxShadow:
                `0 ${size * 0.1}px ${size * 0.22}px rgba(18, 88, 140, 0.28), ` +
                `inset 0 ${-size * 0.05}px ${size * 0.1}px rgba(42, 171, 238, 0.2), ` +
                `inset 0 ${size * 0.03}px ${size * 0.05}px rgba(255, 255, 255, 0.95)`,
            },
          ]}
        >
          {/* Glossy highlight, top-left. */}
          <View style={[styles.gloss, { width: bodyWidth * 0.34, height: bodyHeight * 0.13, top: bodyHeight * 0.07, left: bodyWidth * 0.12 }]} />

          <View style={[styles.faceSlot, { top: bodyHeight * 0.14, height: bodyHeight * 0.72 }]}>
            <AIFace state={state} emotion={emotion} audioLevel={audioLevel} size={bodyWidth * FACE_WIDTH} color={color} />
          </View>
        </LinearGradient>

        <ThinkingDots visible={state === 'thinking'} size={size} />
      </Animated.View>
    </View>
  );
});

/** Three dots that pulse in sequence above the mascot's shoulder while it is thinking. */
function ThinkingDots({ visible, size }: { visible: boolean; size: number }) {
  const presence = useSharedValue(0);
  useEffect(() => {
    presence.value = withTiming(visible ? 1 : 0, { duration: 260 });
  }, [visible, presence]);
  const style = useAnimatedStyle(() => ({ opacity: presence.value, transform: [{ scale: 0.6 + presence.value * 0.4 }] }));

  return (
    <Animated.View pointerEvents="none" style={[styles.dots, { top: -size * 0.05, right: -size * 0.1, gap: size * 0.025, padding: size * 0.04 }, style]}>
      {[0, 1, 2].map((index) => (
        <Dot key={index} index={index} active={visible} size={size * 0.04} />
      ))}
    </Animated.View>
  );
}

function Dot({ index, active, size }: { index: number; active: boolean; size: number }) {
  const lift = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(lift);
    if (!active) {
      lift.value = 0;
      return;
    }
    lift.value = withDelay(
      index * 160,
      withRepeat(withSequence(withTiming(1, { duration: 280 }), withTiming(0, { duration: 280 }), withDelay(360, withTiming(0, { duration: 1 }))), -1),
    );
  }, [active, index, lift]);
  const style = useAnimatedStyle(() => ({ opacity: 0.45 + lift.value * 0.55, transform: [{ translateY: -lift.value * size * 0.9 }] }));
  return <Animated.View style={[{ width: size, height: size, borderRadius: size, backgroundColor: colors.primary }, style]} />;
}

const styles = StyleSheet.create({
  halo: { position: 'absolute', backgroundColor: 'rgba(111, 195, 245, 0.18)' },
  shadow: { position: 'absolute', backgroundColor: '#0E3A5C' },
  body: { flex: 1, alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.9)' },
  ear: { position: 'absolute', borderRadius: 999, backgroundColor: '#CFE7F6', borderWidth: 1, borderColor: '#FFFFFF' },
  gloss: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.85)', transform: [{ rotate: '-12deg' }] },
  faceSlot: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  dots: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.95)',
    boxShadow: '0 6px 16px rgba(18, 88, 140, 0.22)',
  },
});
