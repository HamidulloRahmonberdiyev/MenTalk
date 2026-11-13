import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { Pressable3D } from '@/components/ui/Pressable3D';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { radii, spacing } from '@/theme';
import { easing } from '@/theme/motion';

import { GOLD } from '../path/color';
import type { PathStage } from '../path/path';

const RADIUS = 34;
const DOT = 34;
const DOT_OPEN = 44;
/** Soft lavender, as on Englify's "Zoom events" card: deeper top-left, paler bottom-right. */
const FACE = ['#A396DE', '#C9C3EE'] as const;
const EDGE = '#8576D4';
const DEEP = '#7462CF';
/** Dark tint for the empty road and locked dots, in the card's own purple. */
const SHADE = 'rgba(52, 34, 130, 0.2)';
const SIGN_ART = require('@/assets/icons3d/road-sign-card.png');
const SIGN = 124;

interface PathCardProps {
  stages: readonly PathStage[];
  /** The card itself: opens the whole path. */
  onOpenPath: () => void;
}

/**
 * The path on the home sheet, in the same chunky gradient style as the other home cards: a big
 * title with a progress pill, the 3D signpost on the right and a mini road of every stage below.
 */
export function PathCard({ stages, onOpenPath }: PathCardProps) {
  const t = useT();
  const passed = stages.filter((stage) => stage.status === 'passed').length;
  const openIndex = stages.findIndex((stage) => stage.status === 'open');
  const reach = stages.length > 1 ? (openIndex >= 0 ? openIndex : stages.length - 1) / (stages.length - 1) : 1;
  const progress = t('path.progress', { done: passed, total: stages.length });

  return (
    <Pressable3D
      accessibilityRole="button"
      accessibilityLabel={`${t('path.title')}. ${progress}`}
      onPress={() => {
        haptics.light();
        onOpenPath();
      }}
      edgeColor={EDGE}
      depth={6}
      radius={RADIUS}
    >
      <LinearGradient colors={FACE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        {/* Quiet light shapes for depth, as behind the home hero. */}
        <View pointerEvents="none" style={[styles.orb, styles.orbA]} />
        <View pointerEvents="none" style={[styles.orb, styles.orbB]} />

        {/* The 3D signpost, fully inside the card: a soft halo behind it, a shadow pooled under its base. */}
        <View style={styles.sign} pointerEvents="none">
          <View style={styles.signHalo} />
          <View style={styles.signFloor} />
          <Image source={SIGN_ART} style={styles.signImage} contentFit="contain" />
        </View>

        <View style={styles.head}>
          <AppText color="#FFFFFF" numberOfLines={2} adjustsFontSizeToFit style={styles.title}>
            {t('path.title')}
          </AppText>
          <View style={styles.pill}>
            <Ionicons name="flag" size={13} color="#FFFFFF" />
            <AppText color="#FFFFFF" numberOfLines={1} adjustsFontSizeToFit style={styles.pillText}>
              {progress}
            </AppText>
          </View>
        </View>

        <MiniRoad stages={stages} reach={reach} />
      </LinearGradient>
    </Pressable3D>
  );
}

/** Every stage as a dot on one line; the line fills up to where the learner stands. */
function MiniRoad({ stages, reach }: { stages: readonly PathStage[]; reach: number }) {
  return (
    <View style={styles.road}>
      <View style={styles.line}>
        <View style={[styles.lineFill, { width: `${reach * 100}%` }]} />
      </View>
      {stages.map((stage) => (
        <RoadDot key={stage.scenario.id} stage={stage} />
      ))}
    </View>
  );
}

function RoadDot({ stage }: { stage: PathStage }) {
  if (stage.status === 'open') return <OpenDot stage={stage} />;
  const passed = stage.status === 'passed';
  return (
    <View style={[styles.dot, passed ? styles.dotPassed : styles.dotLocked]}>
      {passed ? (
        <Ionicons name={stage.stars === 3 ? 'star' : 'checkmark'} size={16} color={stage.stars === 3 ? GOLD : DEEP} />
      ) : (
        <Ionicons name="lock-closed" size={13} color="rgba(255,255,255,0.85)" />
      )}
    </View>
  );
}

/** The open stage: bigger, in its own colour, with a ring breathing out of it. */
function OpenDot({ stage }: { stage: PathStage }) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    pulse.set(withRepeat(withTiming(1, { duration: 1700, easing: easing.out }), -1, false));
    return () => cancelAnimation(pulse);
  }, [pulse, reduceMotion]);

  const ring = useAnimatedStyle(() => ({
    opacity: 0.8 * (1 - pulse.get()),
    transform: [{ scale: 1 + pulse.get() * 0.5 }],
  }));

  return (
    <View style={styles.openBox}>
      <Animated.View style={[styles.openRing, ring]} />
      <View style={[styles.openDot, { boxShadow: '0 4px 10px rgba(52, 34, 130, 0.3)' }]}>
        <Ionicons name={stage.scenario.icon} size={20} color={DEEP} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    // Same height as the other home cards.
    minHeight: 196,
    padding: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md + 2,
    justifyContent: 'space-between',
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  orb: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255, 255, 255, 0.16)' },
  orbA: { width: 180, height: 180, top: -70, right: -50 },
  orbB: { width: 120, height: 120, bottom: -60, left: -40, backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  head: { marginRight: SIGN - spacing.md, gap: spacing.sm },
  title: { fontSize: 32, lineHeight: 35, fontWeight: '900', letterSpacing: -0.8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: DEEP,
    boxShadow: '0 3px 8px rgba(52, 34, 130, 0.25)',
  },
  pillText: { flexShrink: 1, fontSize: 13, lineHeight: 18, fontWeight: '800' },
  sign: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
    width: SIGN,
    height: SIGN,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '6deg' }],
  },
  signHalo: {
    position: 'absolute',
    width: SIGN * 0.78,
    height: SIGN * 0.78,
    borderRadius: SIGN,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    boxShadow: '0 0 28px 10px rgba(255, 255, 255, 0.35)',
  },
  signFloor: {
    position: 'absolute',
    bottom: 2,
    width: SIGN * 0.5,
    height: 10,
    borderRadius: SIGN,
    backgroundColor: 'rgba(52, 34, 130, 0.22)',
    boxShadow: '0 0 10px 4px rgba(52, 34, 130, 0.18)',
  },
  signImage: { width: SIGN, height: SIGN },

  road: {
    height: DOT_OPEN + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  line: {
    position: 'absolute',
    left: DOT / 2,
    right: DOT / 2,
    height: 6,
    borderRadius: 3,
    backgroundColor: SHADE,
    overflow: 'hidden',
  },
  lineFill: { height: '100%', borderRadius: 3, backgroundColor: '#FFFFFF' },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotPassed: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(52, 34, 130, 0.25)',
  },
  dotLocked: {
    backgroundColor: SHADE,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  openBox: { width: DOT_OPEN, height: DOT_OPEN, alignItems: 'center', justifyContent: 'center' },
  openRing: {
    position: 'absolute',
    width: DOT_OPEN,
    height: DOT_OPEN,
    borderRadius: DOT_OPEN / 2,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  openDot: {
    width: DOT_OPEN,
    height: DOT_OPEN,
    borderRadius: DOT_OPEN / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
  },
});
