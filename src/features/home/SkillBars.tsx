import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { CircularProgress } from '@/components/ui/CircularProgress';
import { radii, spacing } from '@/theme';
import type { IconName } from '@/types';

export interface SkillBar {
  key: string;
  label: string;
  icon: IconName;
  /** Accent for the stat's icon. */
  tint: string;
  /** Shown big, e.g. "3/5". */
  value: string;
  /** 0..1 */
  progress: number;
}

const RADIUS = 34;
const DEPTH = 6;
const RING = 64;
const GRADIENT = ['#8EE04B', '#3FAE2A'] as const;
const EDGE = '#2C8A1C';
const INK = '#1F4A12';

const clamp = (value: number) => Math.min(Math.max(value, 0), 1);

/**
 * Today's goal as a gradient card of the same family as the talk and vocabulary cards: big title,
 * oversized decorative icon, a white ring, and the other numbers on a white strip.
 */
export function SkillBars({ bars }: { bars: SkillBar[] }) {
  const [goal, ...rest] = bars;
  if (!goal) return null;
  const progress = clamp(goal.progress);

  return (
    <View style={styles.outer}>
      <View style={styles.edge} />
      <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <View style={styles.art} pointerEvents="none">
          <Ionicons name={goal.icon} size={150} color="rgba(20, 60, 10, 0.2)" style={styles.artShadow} />
          <Ionicons name={goal.icon} size={150} color="rgba(255, 255, 255, 0.3)" />
        </View>

        <View style={styles.top} accessible accessibilityLabel={`${goal.label}: ${goal.value}`}>
          <View style={styles.flex}>
            <AppText color="#FFFFFF" numberOfLines={1} adjustsFontSizeToFit style={styles.title}>
              {goal.label}
            </AppText>
            <AppText color="rgba(255, 255, 255, 0.92)" style={styles.goalValue}>
              {goal.value}
            </AppText>
          </View>
          <View style={styles.ringFace}>
            <CircularProgress value={progress} size={RING} strokeWidth={7} color={INK} trackColor="rgba(31, 74, 18, 0.15)">
              {progress >= 1 ? (
                <Ionicons name="checkmark" size={26} color={INK} />
              ) : (
                <AppText color={INK} style={styles.percent}>{`${Math.round(progress * 100)}%`}</AppText>
              )}
            </CircularProgress>
          </View>
        </View>

        <View style={styles.stats}>
          {rest.map((bar) => (
            <View key={bar.key} style={styles.stat} accessible accessibilityLabel={`${bar.label}: ${bar.value}`}>
              <View style={styles.statHead}>
                <Ionicons name={bar.icon} size={15} color={bar.tint} />
                <AppText color={INK} numberOfLines={1} adjustsFontSizeToFit style={styles.statValue}>
                  {bar.value}
                </AppText>
              </View>
              <AppText color="#4E6B44" numberOfLines={1} adjustsFontSizeToFit style={styles.statLabel}>
                {bar.label}
              </AppText>
            </View>
          ))}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  // Same raised look as Pressable3D, without the press: the face rests on a darker edge.
  outer: { paddingBottom: DEPTH, borderRadius: RADIUS },
  edge: { position: 'absolute', left: 0, right: 0, bottom: 0, top: DEPTH, borderRadius: RADIUS, backgroundColor: EDGE },
  card: {
    gap: spacing.lg,
    padding: spacing.xl,
    paddingTop: spacing.lg,
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  art: {
    position: 'absolute',
    right: 60,
    bottom: -40,
    transform: [{ rotate: '-14deg' }],
  },
  artShadow: {
    position: 'absolute',
    transform: [{ translateX: 7 }, { translateY: 7 }],
  },
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: {
    fontSize: 38,
    lineHeight: 46,
    fontWeight: '900',
    letterSpacing: -1,
  },
  goalValue: { fontSize: 18, lineHeight: 22, fontWeight: '800' },
  ringFace: {
    padding: 4,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
  },
  percent: { fontSize: 15, lineHeight: 18, fontWeight: '900' },
  stats: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
  },
  stat: { flex: 1, gap: 2 },
  statHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { flex: 1, fontSize: 18, lineHeight: 22, fontWeight: '800' },
  statLabel: { fontSize: 12, lineHeight: 15, fontWeight: '600' },
});
