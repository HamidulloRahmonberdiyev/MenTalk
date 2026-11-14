import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import Svg, { Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { AppText } from '@/components/ui/AppText';
import { useT } from '@/i18n';
import { radii, spacing } from '@/theme';
import { easing, enter } from '@/theme/motion';

import { StarRow } from '../path/StarRow';

/** Sky into indigo: the home cards' blue family, deep enough for the gold cup to glow on. */
const FACE = ['#4FC3FF', '#3B8BF5', '#5B5CE6'] as const;
const EDGE = '#3F43C2';
const RADIUS = 34;
const DEPTH = 6;
/** Deep indigo for the topic pill. */
const DEEP = '#3438B0';
/** The "congratulations" line, in the cup's gold. */
const GOLD = '#FFE066';
const CUP_ART = require('@/assets/icons3d/cup.png');
const CUP = 156;
const STAGE = CUP + 28;
/** The sunburst behind the cup; wider than the card, which clips it. */
const BURST = 360;
const RAYS = 16;
/** A crisp drop under the white title, so it reads on the bright sky. */
const LIFT = { textShadowColor: 'rgba(30, 40, 140, 0.35)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 };

/** Wedges from the centre, every other slice of the circle. */
const RAYS_PATH = Array.from({ length: RAYS }, (_, index) => {
  const c = BURST / 2;
  const step = Math.PI / RAYS;
  const from = index * 2 * step;
  const to = from + step;
  return `M${c} ${c}L${c + c * Math.cos(from)} ${c + c * Math.sin(from)}L${c + c * Math.cos(to)} ${c + c * Math.sin(to)}Z`;
}).join('');

interface Piece {
  left?: DimensionValue;
  right?: DimensionValue;
  top: number;
  width: number;
  height: number;
  color: string;
  rotate: number;
  delay: number;
}

/** Confetti bursting out around the cup: gold, lime, pink and white, as on the rest of the app. */
const CONFETTI: Piece[] = [
  { left: '7%', top: 26, width: 8, height: 16, color: '#FFD447', rotate: 30, delay: 140 },
  { left: '19%', top: 96, width: 8, height: 8, color: '#FF86C8', rotate: 0, delay: 220 },
  { left: '10%', top: 158, width: 6, height: 14, color: '#89E219', rotate: -25, delay: 280 },
  { left: '30%', top: 16, width: 6, height: 6, color: '#FFFFFF', rotate: 0, delay: 200 },
  { right: '8%', top: 30, width: 8, height: 16, color: '#89E219', rotate: -35, delay: 180 },
  { right: '20%', top: 104, width: 8, height: 8, color: '#FFD447', rotate: 45, delay: 260 },
  { right: '11%', top: 166, width: 6, height: 14, color: '#FFFFFF', rotate: 20, delay: 320 },
  { right: '31%', top: 12, width: 7, height: 13, color: '#FF86C8', rotate: 60, delay: 240 },
];

interface ResultHeroProps {
  /** 0–3, by the same rules as the path's stars. */
  stars: number;
  title: string;
  subtitle: string;
  topic: string;
}

/** The top of the result: the 3D cup on a slowly turning sunburst, confetti, the stars, the verdict and the topic. */
export function ResultHero({ stars, title, subtitle, topic }: ResultHeroProps) {
  const t = useT();
  return (
    <Animated.View entering={enter.rise()} style={styles.wrap}>
      {/* The darker edge peeking out under the face, as on the home cards. */}
      <View style={styles.edge} />
      <LinearGradient colors={FACE} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.card}>
        <View pointerEvents="none" style={[styles.orb, styles.orbA]} />
        <View pointerEvents="none" style={[styles.orb, styles.orbB]} />

        <View style={styles.stage} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Sunburst />
          <View style={styles.halo} />
          <Animated.View entering={enter.celebrate()}>
            <FloatingCup />
          </Animated.View>
        </View>

        {CONFETTI.map((piece, index) => (
          // The burst animates the outer box; the tilt lives on the inner one so the two transforms never clash.
          <Animated.View
            key={index}
            pointerEvents="none"
            entering={ZoomIn.delay(piece.delay).duration(380).easing(easing.overshoot)}
            style={[styles.piece, { left: piece.left, right: piece.right, top: piece.top }]}
          >
            <View
              style={{
                width: piece.width,
                height: piece.height,
                borderRadius: Math.min(piece.width, piece.height) / 2,
                backgroundColor: piece.color,
                transform: [{ rotate: `${piece.rotate}deg` }],
              }}
            />
          </Animated.View>
        ))}

        <Animated.View entering={ZoomIn.delay(320).duration(420).easing(easing.overshoot)} style={styles.stars}>
          <StarRow count={stars} size={30} gap={8} emptyColor="rgba(255, 255, 255, 0.35)" />
        </Animated.View>

        <Animated.View entering={ZoomIn.delay(420).duration(380).easing(easing.overshoot)}>
          <AppText color={GOLD} style={[styles.congrats, LIFT]} numberOfLines={1} adjustsFontSizeToFit>
            {t('result.congrats').toLocaleUpperCase()}
          </AppText>
        </Animated.View>
        <AppText color="#FFFFFF" style={[styles.title, LIFT]} numberOfLines={2} adjustsFontSizeToFit accessibilityRole="header">
          {title}
        </AppText>
        <AppText color="rgba(255, 255, 255, 0.94)" style={styles.subtitle}>
          {subtitle}
        </AppText>

        <View style={styles.pill}>
          <Ionicons name="chatbubbles" size={14} color="#FFFFFF" />
          <AppText color="#FFFFFF" numberOfLines={1} style={styles.pillText}>
            {topic}
          </AppText>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

/** Soft light rays turning slowly behind the cup; still when the system asks for reduced motion. */
function Sunburst() {
  const reduceMotion = useReducedMotion();
  const spin = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    spin.set(withRepeat(withTiming(1, { duration: 36000, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(spin);
  }, [spin, reduceMotion]);

  const turn = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get() * 360}deg` }] }));

  return (
    <Animated.View pointerEvents="none" style={[styles.burst, turn]}>
      <Svg width={BURST} height={BURST}>
        <Defs>
          <RadialGradient id="resultRays" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.42" />
            <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0.14" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Path d={RAYS_PATH} fill="url(#resultRays)" />
      </Svg>
    </Animated.View>
  );
}

/** The 3D cup hovering gently over its own shadow. */
function FloatingCup() {
  const reduceMotion = useReducedMotion();
  const bob = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    const half = { duration: 1700, easing: Easing.inOut(Easing.sin) };
    bob.set(withRepeat(withSequence(withTiming(1, half), withTiming(0, half)), -1, false));
    return () => cancelAnimation(bob);
  }, [bob, reduceMotion]);

  const lift = useAnimatedStyle(() => ({ transform: [{ translateY: -8 * bob.get() }] }));
  const shadow = useAnimatedStyle(() => ({ opacity: 1 - 0.35 * bob.get(), transform: [{ scaleX: 1 - 0.14 * bob.get() }] }));

  return (
    <View style={styles.cupBox}>
      <Animated.View style={[styles.floor, shadow]} />
      <Animated.View style={lift}>
        <Image source={CUP_ART} style={styles.cup} contentFit="contain" transition={150} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: DEPTH, borderRadius: RADIUS },
  edge: {
    position: 'absolute',
    top: DEPTH,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: RADIUS,
    backgroundColor: EDGE,
  },
  card: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  orb: { position: 'absolute', borderRadius: 999 },
  orbA: { width: 200, height: 200, top: -90, right: -60, backgroundColor: 'rgba(255, 255, 255, 0.14)' },
  orbB: { width: 150, height: 150, bottom: -70, left: -50, backgroundColor: 'rgba(255, 255, 255, 0.1)' },

  stage: { width: '100%', height: STAGE, alignItems: 'center', justifyContent: 'center' },
  burst: { position: 'absolute', width: BURST, height: BURST },
  halo: {
    position: 'absolute',
    width: CUP * 0.72,
    height: CUP * 0.72,
    borderRadius: CUP,
    backgroundColor: 'rgba(255, 236, 170, 0.35)',
    boxShadow: '0 0 42px 18px rgba(255, 226, 140, 0.45)',
  },
  cupBox: { width: CUP, height: CUP, alignItems: 'center', justifyContent: 'center' },
  floor: {
    position: 'absolute',
    bottom: 4,
    width: CUP * 0.5,
    height: 12,
    borderRadius: CUP,
    backgroundColor: 'rgba(25, 30, 110, 0.3)',
    boxShadow: '0 0 12px 5px rgba(25, 30, 110, 0.22)',
  },
  cup: { width: CUP, height: CUP },

  piece: { position: 'absolute' },

  stars: { marginTop: -spacing.xs, paddingTop: 10 },
  congrats: { textAlign: 'center', fontSize: 14, lineHeight: 18, fontWeight: '900', letterSpacing: 1.6, marginTop: spacing.xs },
  title: { textAlign: 'center', fontSize: 30, lineHeight: 36, fontWeight: '900', letterSpacing: -0.6 },
  subtitle: { textAlign: 'center', fontSize: 15, lineHeight: 21, fontWeight: '700' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    marginTop: spacing.sm,
    paddingVertical: 7,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: DEEP,
    boxShadow: '0 3px 8px rgba(25, 30, 110, 0.25)',
  },
  pillText: { flexShrink: 1, fontSize: 13, lineHeight: 18, fontWeight: '800' },
});
