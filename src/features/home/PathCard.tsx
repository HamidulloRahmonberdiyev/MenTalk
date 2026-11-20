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
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';

import { AppText } from '@/components/ui/AppText';
import { Pressable3D } from '@/components/ui/Pressable3D';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { radii, spacing } from '@/theme';
import { easing } from '@/theme/motion';

import type { PathStage } from '../path/path';

const RADIUS = 34;
const DEPTH = 5;
const DOT = 32;
const DOT_OPEN = 40;
/** Pale frosted lavender: lightest top-left, deeper toward the bottom-right. */
const FACE = ['#EFEEFD', '#E2E0FC', '#CDCAFA'] as const;
const EDGE = '#918DEA';
/** Dark ink for the title, so it reads on the pale face. */
const INK = '#1C1442';
const DEEP = '#5B44D4';
const PILL = ['#7D60DA', '#634FCB'] as const;
const STAR = '#FDB80F';
/** One lavender wash for the ridges and the hill; each shape sets how strong it is. */
const HILL = '#786EF0';
/** Tint for the empty part of the road and for locked dots. */
const SHADE = 'rgba(116, 98, 207, 0.16)';
/**
 * A winding 3D road with a flag pin (1536×1024, landscape) on a transparent background. The road
 * fills about 81% × 75% of the frame, so the frame runs past the card's right edge while the road
 * itself stays inside.
 */
const ROAD_ART = require('@/assets/icons3d/road-card.png');
const ROAD_WIDTH = 196;
const ROAD_HEIGHT = Math.round((ROAD_WIDTH * 1024) / 1536);
/**
 * Room the title and pill leave on the right. The art is wider than this on purpose: its top-left
 * corner is empty, and the near end of the road tucks under the pill's right end.
 */
const HEAD_INSET = 102;
/** The ridges' drawing box, pinned to the card's top-right corner. */
const RIDGES = { width: 220, height: 120 };
/** The hill's drawing box, pinned to the card's bottom-left corner. */
const HILLSIDE = { width: 190, height: 26 };

interface PathCardProps {
  stages: readonly PathStage[];
  /** The card itself: opens the whole path. */
  onOpenPath: () => void;
}

/**
 * The path on the home sheet: a pale lavender card with soft hills, a dark title over a progress
 * pill, the 3D road on the right and a mini road of every stage below.
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
      depth={DEPTH}
      radius={RADIUS}
      style={styles.glow}
    >
      <LinearGradient colors={FACE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <Scenery />

        {/* The 3D road, drawn before the text so the pill sits over the road's near end. */}
        <View style={styles.art} pointerEvents="none">
          <Image source={ROAD_ART} style={styles.artImage} contentFit="contain" />
        </View>

        <View style={styles.head}>
          <AppText color={INK} numberOfLines={2} adjustsFontSizeToFit style={styles.title}>
            {t('path.title')}
          </AppText>
          <LinearGradient colors={PILL} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.pill}>
            <Ionicons name="flag" size={13} color="#FFFFFF" />
            <AppText color="#FFFFFF" numberOfLines={1} adjustsFontSizeToFit style={styles.pillText}>
              {progress}
            </AppText>
          </LinearGradient>
        </View>

        <MiniRoad stages={stages} reach={reach} />
      </LinearGradient>
    </Pressable3D>
  );
}

/**
 * The backdrop: two misty ridges behind the road, each fading out below its crest, and a low hill
 * rising out of the bottom-left corner.
 */
function Scenery() {
  return (
    <>
      <Svg
        pointerEvents="none"
        style={styles.ridges}
        width={RIDGES.width}
        height={RIDGES.height}
        viewBox={`0 0 ${RIDGES.width} ${RIDGES.height}`}
      >
        <Defs>
          <SvgGradient id="pathRidgeBack" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={HILL} stopOpacity={0.3} />
            <Stop offset="0.4" stopColor={HILL} stopOpacity={0} />
          </SvgGradient>
          <SvgGradient id="pathRidgeFront" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={HILL} stopOpacity={0.22} />
            <Stop offset="0.65" stopColor={HILL} stopOpacity={0} />
          </SvgGradient>
        </Defs>
        <Path
          d="M0 70 C60 54 120 38 162 26 Q178 19 194 25 Q208 30 220 35 V120 H0 Z"
          fill="url(#pathRidgeBack)"
        />
        <Path
          d="M0 82 C40 68 80 52 100 44 Q115 37 130 44 C160 56 190 70 220 84 V120 H0 Z"
          fill="url(#pathRidgeFront)"
        />
      </Svg>
      <Svg
        pointerEvents="none"
        style={styles.hill}
        width={HILLSIDE.width}
        height={HILLSIDE.height}
        viewBox={`0 0 ${HILLSIDE.width} ${HILLSIDE.height}`}
      >
        <Path d="M0 26 V22 C30 16 55 6 91 6 C125 6 150 18 180 26 Z" fill={HILL} fillOpacity={0.3} />
      </Svg>
    </>
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
        <Ionicons name={stage.stars === 3 ? 'star' : 'checkmark'} size={18} color={stage.stars === 3 ? STAR : DEEP} />
      ) : (
        <Ionicons name="lock-closed" size={13} color="rgba(91, 68, 212, 0.55)" />
      )}
    </View>
  );
}

/** The open stage: bigger, with a ring breathing out of it. */
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
      <View style={styles.openDot}>
        <Ionicons name={stage.scenario.icon} size={18} color={DEEP} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // A soft lavender glow around the whole card, edge included.
  glow: { boxShadow: '0 0 22px rgba(190, 180, 255, 0.45)' },
  card: {
    // Same height as the other home cards.
    minHeight: 192,
    paddingTop: 18,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    justifyContent: 'space-between',
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.75)',
    overflow: 'hidden',
  },
  ridges: { position: 'absolute', top: 0, right: 0 },
  hill: { position: 'absolute', bottom: 0, left: 0 },
  art: {
    position: 'absolute',
    top: 18,
    right: -15,
    width: ROAD_WIDTH,
    height: ROAD_HEIGHT,
  },
  artImage: { width: ROAD_WIDTH, height: ROAD_HEIGHT },

  head: { marginRight: HEAD_INSET, gap: 14 },
  title: { marginLeft: spacing.sm, fontSize: 31, lineHeight: 33, fontWeight: '900', letterSpacing: -0.6 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    boxShadow: '0 4px 10px rgba(98, 78, 202, 0.35)',
  },
  pillText: { flexShrink: 1, fontSize: 12, lineHeight: 16, fontWeight: '800' },

  road: {
    height: DOT_OPEN,
    marginHorizontal: 6,
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
    boxShadow: '0 4px 10px rgba(80, 60, 180, 0.2), inset 0 -3px 0 rgba(116, 98, 207, 0.1)',
  },
  dotLocked: {
    backgroundColor: SHADE,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.85)',
  },
  openBox: { width: DOT_OPEN, height: DOT_OPEN, alignItems: 'center', justifyContent: 'center' },
  openRing: {
    position: 'absolute',
    width: DOT_OPEN,
    height: DOT_OPEN,
    borderRadius: DOT_OPEN / 2,
    borderWidth: 3,
    borderColor: 'rgba(91, 68, 212, 0.45)',
  },
  openDot: {
    width: DOT_OPEN,
    height: DOT_OPEN,
    borderRadius: DOT_OPEN / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: 'rgba(91, 68, 212, 0.25)',
    boxShadow: '0 4px 10px rgba(80, 60, 180, 0.3)',
  },
});
