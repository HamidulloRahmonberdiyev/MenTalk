import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { CircularProgress } from '@/components/ui/CircularProgress';
import { useT } from '@/i18n';
import { radii, spacing } from '@/theme';
import { easing } from '@/theme/motion';
import type { IconName } from '@/types';

import { HERO } from './heroColors';

export interface HeroStat {
  key: string;
  icon: IconName;
  label: string;
  value: string;
}

interface GoalPanelProps {
  minutes: number;
  goalMinutes: number;
  stats: HeroStat[];
}

const clamp = (value: number) => Math.min(Math.max(value, 0), 1);

/** Today's goal on the hero: a ring and a bar of the minutes spoken, and the other numbers in a row beneath. */
export function GoalPanel({ minutes, goalMinutes, stats }: GoalPanelProps) {
  const t = useT();
  const progress = clamp(goalMinutes > 0 ? minutes / goalMinutes : 0);
  const done = progress >= 1;
  const left = Math.max(goalMinutes - minutes, 0);

  const fill = useSharedValue(0);
  useEffect(() => {
    fill.set(withDelay(200, withTiming(progress, { duration: 900, easing: easing.out })));
  }, [fill, progress]);
  const bar = useAnimatedStyle(() => ({ width: `${Math.max(fill.get(), 0.03) * 100}%` }));

  return (
    <View style={styles.panel}>
      <View style={styles.goal} accessible accessibilityLabel={`${t('home.goalTitle')}: ${minutes}/${goalMinutes}`}>
        <CircularProgress value={progress} size={56} strokeWidth={6} color={done ? HERO.flame : HERO.accent} trackColor="rgba(255,255,255,0.12)">
          {done ? (
            <Ionicons name="checkmark" size={24} color={HERO.flame} />
          ) : (
            <AppText color="#FFFFFF" style={styles.percent}>{`${Math.round(progress * 100)}%`}</AppText>
          )}
        </CircularProgress>

        <View style={styles.goalTexts}>
          <View style={styles.headRow}>
            <AppText color={HERO.muted} style={styles.overline} numberOfLines={1}>
              {t('home.goalTitle').toUpperCase()}
            </AppText>
            <AppText color={done ? HERO.flame : HERO.muted} style={styles.hint} numberOfLines={1}>
              {done ? t('home.goalDone') : t('activity.day.goalLeft', { n: left })}
            </AppText>
          </View>
          <View style={styles.valueRow}>
            <AppText color="#FFFFFF" style={styles.value}>
              {minutes}
            </AppText>
            <AppText color={HERO.muted} style={styles.valueOf}>
              / {goalMinutes} {t('home.min')}
            </AppText>
          </View>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, bar]}>
              <LinearGradient
                colors={done ? ['#FFD36B', HERO.flame] : [HERO.accentSoft, HERO.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.stats}>
        {stats.map((stat) => (
          <View key={stat.key} style={styles.stat} accessible accessibilityLabel={`${stat.label}: ${stat.value}`}>
            <View style={styles.statHead}>
              <Ionicons name={stat.icon} size={13} color={HERO.accentSoft} />
              <AppText color="#FFFFFF" numberOfLines={1} adjustsFontSizeToFit style={styles.statValue}>
                {stat.value}
              </AppText>
            </View>
            <AppText color={HERO.muted} numberOfLines={1} adjustsFontSizeToFit style={styles.statLabel}>
              {stat.label}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  goal: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  percent: { fontSize: 13, lineHeight: 16, fontWeight: '900' },
  goalTexts: { flex: 1, gap: 3 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  overline: { flexShrink: 1, fontSize: 10, lineHeight: 13, fontWeight: '800', letterSpacing: 1.1 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  value: { fontSize: 24, lineHeight: 28, fontWeight: '900', letterSpacing: -0.5 },
  valueOf: { fontSize: 14, lineHeight: 18, fontWeight: '700' },
  track: { height: 6, borderRadius: radii.pill, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill, overflow: 'hidden' },
  hint: { flexShrink: 1, fontSize: 11, lineHeight: 13, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.14)' },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, alignItems: 'center', gap: 1 },
  statHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { fontSize: 15, lineHeight: 19, fontWeight: '800' },
  statLabel: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
});
