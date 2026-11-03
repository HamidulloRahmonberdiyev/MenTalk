import { Ionicons } from '@expo/vector-icons';
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
/** Teal, between the blue talk card and the purple vocabulary card, at the same lightness. */
const FACE = ['#72D4E2', '#1F8FBA'] as const;
const EDGE = '#166C8E';
const DEEP = '#1F8FBA';
const INK = '#16324A';

interface PathCardProps {
  stages: readonly PathStage[];
  /** The card itself: opens the whole path. */
  onOpenPath: () => void;
  /** The start button: straight into the open stage. */
  onStart: (stage: PathStage) => void;
}

/**
 * The path on the home sheet, in the same chunky gradient style as the other home cards: a mini
 * road of every stage, and the stage that is open now with a button straight into it.
 */
export function PathCard({ stages, onOpenPath, onStart }: PathCardProps) {
  const t = useT();
  const passed = stages.filter((stage) => stage.status === 'passed').length;
  const openIndex = stages.findIndex((stage) => stage.status === 'open');
  const current = openIndex >= 0 ? stages[openIndex] : null;
  const reach = stages.length > 1 ? (current ? openIndex : stages.length - 1) / (stages.length - 1) : 1;

  return (
    <Pressable3D
      accessibilityRole="button"
      accessibilityLabel={`${t('path.title')}. ${t('path.progress', { done: passed, total: stages.length })}`}
      onPress={() => {
        haptics.light();
        onOpenPath();
      }}
      edgeColor={EDGE}
      depth={6}
      radius={RADIUS}
    >
      <LinearGradient colors={FACE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <View style={styles.art} pointerEvents="none">
          <Ionicons name="trail-sign" size={150} color="rgba(8, 45, 70, 0.2)" style={styles.artShadow} />
          <Ionicons name="trail-sign" size={150} color="rgba(255, 255, 255, 0.3)" />
        </View>

        <View style={styles.head}>
          <View style={styles.headTexts}>
            <AppText color="#FFFFFF" numberOfLines={1} adjustsFontSizeToFit style={styles.title}>
              {t('path.title')}
            </AppText>
            <AppText color="rgba(255,255,255,0.92)" style={styles.subtitle}>
              {t('path.progress', { done: passed, total: stages.length })}
            </AppText>
          </View>
          <View style={styles.arrow}>
            <Ionicons name="arrow-up" size={20} color={INK} style={styles.arrowIcon} />
          </View>
        </View>

        <MiniRoad stages={stages} reach={reach} />

        {current ? (
          <View style={styles.panel}>
            <LinearGradient colors={FACE} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.panelIcon}>
              <Ionicons name={current.scenario.icon} size={22} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.panelTexts}>
              <AppText color={DEEP} style={styles.panelStage} numberOfLines={1}>
                {t('path.stage', { n: current.number }).toUpperCase()}
              </AppText>
              <AppText color={INK} style={styles.panelTitle} numberOfLines={1}>
                {t(`scenario.${current.scenario.id}.title`)}
              </AppText>
            </View>
            <Pressable3D
              accessibilityRole="button"
              accessibilityLabel={`${t('path.start')}: ${t(`scenario.${current.scenario.id}.title`)}`}
              onPress={() => {
                haptics.selection();
                onStart(current);
              }}
              edgeColor={EDGE}
              depth={4}
              radius={radii.pill}
              faceStyle={styles.go}
            >
              <AppText color="#FFFFFF" style={styles.goText} numberOfLines={1}>
                {t('path.start')}
              </AppText>
              <Ionicons name="play" size={14} color="#FFFFFF" />
            </Pressable3D>
          </View>
        ) : (
          <View style={styles.panel}>
            <View style={[styles.panelIcon, styles.cup]}>
              <Ionicons name="trophy" size={22} color="#FFFFFF" />
            </View>
            <AppText color={INK} style={[styles.panelTitle, styles.panelTexts]} numberOfLines={2}>
              {t('path.finish.done')}
            </AppText>
          </View>
        )}
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
      <View style={[styles.openDot, { boxShadow: '0 4px 10px rgba(8, 45, 70, 0.3)' }]}>
        <Ionicons name={stage.scenario.icon} size={20} color={DEEP} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.lg,
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  art: {
    position: 'absolute',
    right: -26,
    top: 40,
    transform: [{ rotate: '-12deg' }],
  },
  artShadow: {
    position: 'absolute',
    transform: [{ translateX: 7 }, { translateY: 7 }],
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  headTexts: { flex: 1, gap: 2 },
  title: { fontSize: 28, lineHeight: 36, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, lineHeight: 19, fontWeight: '700' },
  arrow: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  arrowIcon: { transform: [{ rotate: '45deg' }] },

  road: {
    height: DOT_OPEN + 8,
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
    backgroundColor: 'rgba(8, 45, 70, 0.22)',
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
    borderBottomColor: 'rgba(8, 45, 70, 0.25)',
  },
  dotLocked: {
    backgroundColor: 'rgba(8, 45, 70, 0.22)',
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

  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    paddingRight: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  panelIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cup: { backgroundColor: GOLD },
  panelTexts: { flex: 1 },
  panelStage: { fontSize: 11, lineHeight: 15, fontWeight: '800', letterSpacing: 0.8 },
  panelTitle: { fontSize: 17, lineHeight: 22, fontWeight: '800' },
  go: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    backgroundColor: DEEP,
  },
  goText: { fontSize: 15, lineHeight: 20, fontWeight: '800' },
});
