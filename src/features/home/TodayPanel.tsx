import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
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
import { CircularProgress } from '@/components/ui/CircularProgress';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT, type TranslationKey } from '@/i18n';
import { haptics } from '@/services/haptics';
import { radii, spacing } from '@/theme';
import { easing } from '@/theme/motion';

import { useWeek, type WeekDay } from '../activity/useWeek';
import { HERO, useHeroTone } from './heroColors';

interface TodayPanelProps {
  minutes: number;
  goalMinutes: number;
}

const RING = 58;
const DOT = 28;
const GOLD = ['#FFD75E', '#FF9E1B'] as const;

/**
 * The learner's day on the home hero, in one glass panel: today's goal ring, the streak, and this
 * week as seven dots. It answers "did I practise today, and is my streak safe?" at a glance; the
 * full calendar is one tap away.
 */
export function TodayPanel({ minutes, goalMinutes }: TodayPanelProps) {
  const t = useT();
  const week = useWeek();
  const progress = goalMinutes > 0 ? Math.min(minutes / goalMinutes, 1) : 0;
  const done = progress >= 1;
  const left = Math.max(goalMinutes - minutes, 0);
  const hot = week.streak > 0;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={[
        `${t('home.goalTitle')}: ${minutes}/${goalMinutes} ${t('home.min')}`,
        hot ? t('activity.card.streak', { n: week.streak }) : t('activity.card.noStreak'),
        t('activity.open'),
      ].join('. ')}
      scaleTo={0.98}
      onPress={() => {
        haptics.light();
        router.push('/activity');
      }}
      style={styles.panel}
    >
      <View style={styles.top}>
        <GoalRing progress={progress} done={done} />

        <View style={styles.texts}>
          <AppText color={HERO.muted} style={styles.overline} numberOfLines={1}>
            {t('home.goalTitle').toUpperCase()}
          </AppText>
          <View style={styles.valueRow}>
            <AppText color="#FFFFFF" style={styles.value}>
              {minutes}
            </AppText>
            <AppText color={HERO.muted} style={styles.valueOf} numberOfLines={1}>
              / {goalMinutes} {t('home.min')}
            </AppText>
          </View>
          <AppText color={done ? HERO.flameInk : HERO.muted} style={styles.hint} numberOfLines={1}>
            {done ? t('home.goalDone') : t('activity.day.goalLeft', { n: left })}
          </AppText>
        </View>

        <StreakBadge streak={week.streak} />
      </View>

      <View style={styles.divider} />

      <View style={styles.week}>
        {week.days.map((day, index) => (
          <DayDot key={day.date} day={day} weekday={t(`activity.wd.${index + 1}` as TranslationKey)} />
        ))}
      </View>
    </PressableScale>
  );
}

/** Today's minutes against the goal; a met goal turns the ring amber with a tick. */
function GoalRing({ progress, done }: { progress: number; done: boolean }) {
  return (
    <View style={styles.ringWrap}>
      <CircularProgress
        value={progress}
        size={RING}
        strokeWidth={6}
        color={done ? HERO.flame : '#FFFFFF'}
        trackColor="rgba(255,255,255,0.22)"
      >
        {done ? (
          <Ionicons name="checkmark" size={26} color={HERO.flame} />
        ) : (
          <AppText color="#FFFFFF" style={styles.percent}>{`${Math.round(progress * 100)}%`}</AppText>
        )}
      </CircularProgress>
    </View>
  );
}

/** Gold flame pill while the streak is alive, a quiet frosted one before it starts. */
function StreakBadge({ streak }: { streak: number }) {
  const hot = streak > 0;
  if (!hot) {
    return (
      <View style={[styles.streak, styles.streakCold]}>
        <Ionicons name="flame-outline" size={20} color={HERO.faint} />
        <AppText color={HERO.faint} style={styles.streakNumber}>
          0
        </AppText>
      </View>
    );
  }
  return (
    <LinearGradient colors={GOLD} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={[styles.streak, styles.streakHot]}>
      <Ionicons name="flame" size={20} color="#FFFFFF" />
      <AppText color="#FFFFFF" style={styles.streakNumber}>
        {streak}
      </AppText>
    </LinearGradient>
  );
}

/** One day of the week: amber with a flame for a met goal, frosted for some practice, white for today. */
function DayDot({ day, weekday }: { day: WeekDay; weekday: string }) {
  const hero = useHeroTone();
  const number = Number(day.date.slice(8));
  const met = day.level === 4;
  const active = day.level > 0;

  let dot;
  if (met) {
    dot = (
      <LinearGradient colors={GOLD} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={[styles.dot, styles.dotMet]}>
        <Ionicons name="flame" size={14} color="#FFFFFF" />
      </LinearGradient>
    );
  } else if (day.today) {
    dot = (
      <View style={[styles.dot, styles.dotToday, active && styles.dotTodayActive]}>
        <AppText color={hero.deep} style={styles.dayNumber}>
          {number}
        </AppText>
      </View>
    );
  } else if (active) {
    dot = (
      <View style={[styles.dot, styles.dotActive]}>
        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
      </View>
    );
  } else {
    dot = (
      <View style={[styles.dot, day.future ? styles.dotFuture : styles.dotMissed]}>
        <AppText color={day.future ? HERO.faint : HERO.muted} style={[styles.dayNumber, styles.dayNumberQuiet]}>
          {number}
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.day}>
      <AppText color={day.today ? '#FFFFFF' : HERO.faint} style={[styles.weekday, day.today && styles.weekdayToday]}>
        {weekday}
      </AppText>
      <View style={styles.dotWrap}>
        {day.today && !met ? <TodayPulse /> : null}
        {dot}
      </View>
    </View>
  );
}

/** A soft ring breathing around today, so the eye finds it first. */
function TodayPulse() {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    pulse.set(withRepeat(withTiming(1, { duration: 2000, easing: easing.out }), -1, false));
    return () => cancelAnimation(pulse);
  }, [pulse, reduceMotion]);

  const ring = useAnimatedStyle(() => ({
    opacity: 0.6 * (1 - pulse.get()),
    transform: [{ scale: 1 + pulse.get() * 0.45 }],
  }));

  return <Animated.View pointerEvents="none" style={[styles.pulse, ring]} />;
}

const styles = StyleSheet.create({
  panel: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ringWrap: {
    borderRadius: RING,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  percent: { fontSize: 14, lineHeight: 17, fontWeight: '900' },
  texts: { flex: 1, gap: 1 },
  overline: { fontSize: 10, lineHeight: 13, fontWeight: '800', letterSpacing: 1.1 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  value: { fontSize: 24, lineHeight: 28, fontWeight: '900', letterSpacing: -0.5 },
  valueOf: { flexShrink: 1, fontSize: 14, lineHeight: 18, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 15, fontWeight: '700' },

  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.pill,
  },
  streakHot: {
    borderWidth: 1.5,
    borderColor: '#FFE9A8',
    boxShadow: '0 6px 14px rgba(200, 110, 0, 0.4)',
  },
  streakCold: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  streakNumber: { fontSize: 18, lineHeight: 22, fontWeight: '900' },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.22)' },

  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: 4 },
  weekday: { fontSize: 11, lineHeight: 13, fontWeight: '700', letterSpacing: 0.3 },
  weekdayToday: { fontWeight: '900' },
  dotWrap: { width: DOT, height: DOT, alignItems: 'center', justifyContent: 'center' },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, alignItems: 'center', justifyContent: 'center' },
  dotMet: { borderWidth: 1.5, borderColor: '#FFE9A8', boxShadow: '0 4px 10px rgba(200, 110, 0, 0.35)' },
  dotToday: { backgroundColor: '#FFFFFF', boxShadow: '0 4px 12px rgba(8, 70, 130, 0.3)' },
  dotTodayActive: { borderWidth: 2.5, borderColor: '#7FD4FF' },
  dotActive: { backgroundColor: 'rgba(255,255,255,0.35)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.75)' },
  dotMissed: { backgroundColor: 'rgba(255,255,255,0.12)' },
  dotFuture: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', borderStyle: 'dashed' },
  dayNumber: { fontSize: 12, lineHeight: 15, fontWeight: '900' },
  dayNumberQuiet: { fontWeight: '700' },
  pulse: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
