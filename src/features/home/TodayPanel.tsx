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
import { FireIcon } from '@/components/ui/FireIcon';
import { Pressable3D } from '@/components/ui/Pressable3D';
import { useT, type TranslationKey } from '@/i18n';
import { haptics } from '@/services/haptics';
import { radii, spacing } from '@/theme';
import { usePalette } from '@/theme/appearance';
import { easing } from '@/theme/motion';

import { useWeek, type WeekDay } from '../activity/useWeek';

interface TodayPanelProps {
  minutes: number;
  goalMinutes: number;
}

const RADIUS = 30;
const RING = 60;
const DOT = 32;
const WHITE = '#FFFFFF';
/** Deep blue ink for numbers on white chips. */
const INK = '#0A7FE0';
/** The streak keeps its ember ink, since it sits beside the flame. */
const FIRE_INK = '#E2480F';

/**
 * A bright blue card in the same family as the other big home cards (gradient face on a raised edge,
 * soft light orbs), matching the app's blue hero; the night look is a touch deeper so
 * it does not glare on the dark page.
 */
const TONES = {
  light: {
    gradient: ['#3DB4FF', '#0A8CF2'] as const,
    edge: '#066FC7',
    shadow: '0 12px 26px rgba(10, 140, 242, 0.32)',
  },
  dark: {
    gradient: ['#1F95EC', '#0A6FCC'] as const,
    edge: '#07519A',
    shadow: '0 12px 26px rgba(0, 0, 0, 0.42)',
  },
} as const;

/**
 * The learner's day at the top of home: today's goal ring, the streak and this week as seven days.
 * It answers "did I practise today, and is my streak safe?" at a glance; the full calendar is a tap away.
 */
export function TodayPanel({ minutes, goalMinutes }: TodayPanelProps) {
  const t = useT();
  const week = useWeek();
  const tone = TONES[usePalette().appearance];
  const progress = goalMinutes > 0 ? Math.min(minutes / goalMinutes, 1) : 0;
  const done = progress >= 1;
  const left = Math.max(goalMinutes - minutes, 0);
  const hot = week.streak > 0;

  return (
    <Pressable3D
      accessibilityRole="button"
      accessibilityLabel={[
        `${t('home.goalTitle')}: ${minutes}/${goalMinutes} ${t('home.min')}`,
        hot ? t('activity.card.streak', { n: week.streak }) : t('activity.card.noStreak'),
        t('activity.open'),
      ].join('. ')}
      onPress={() => {
        haptics.light();
        router.push('/activity');
      }}
      edgeColor={tone.edge}
      depth={6}
      radius={RADIUS}
      style={{ boxShadow: tone.shadow }}
    >
      <LinearGradient colors={tone.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.face}>
        <View pointerEvents="none" style={[styles.orb, styles.orbA]} />
        <View pointerEvents="none" style={[styles.orb, styles.orbB]} />

        <View style={styles.top}>
          <CircularProgress
            value={progress}
            size={RING}
            strokeWidth={6}
            color={WHITE}
            trackColor="rgba(255, 255, 255, 0.3)"
          >
            {done ? (
              <Ionicons name="checkmark" size={28} color={WHITE} />
            ) : (
              <AppText color={WHITE} style={styles.percent}>{`${Math.round(progress * 100)}%`}</AppText>
            )}
          </CircularProgress>

          <View style={styles.texts}>
            <AppText color="rgba(255, 255, 255, 0.85)" style={styles.overline} numberOfLines={1}>
              {t('home.goalTitle').toUpperCase()}
            </AppText>
            <View style={styles.valueRow}>
              <AppText color={WHITE} style={styles.value}>
                {minutes}
              </AppText>
              <AppText color="rgba(255, 255, 255, 0.88)" style={styles.valueOf} numberOfLines={1}>
                / {goalMinutes} {t('home.min')}
              </AppText>
            </View>
            <AppText color="rgba(255, 255, 255, 0.88)" style={styles.hint} numberOfLines={1}>
              {done ? t('home.goalDone') : t('activity.day.goalLeft', { n: left })}
            </AppText>
          </View>

          <StreakBadge streak={week.streak} />
        </View>

        {/* This week on a frosted tray, so the seven days read as one strip. */}
        <View style={styles.tray}>
          {week.days.map((day, index) => (
            <DayDot key={day.date} day={day} weekday={t(`activity.wd.${index + 1}` as TranslationKey)} />
          ))}
        </View>
      </LinearGradient>
    </Pressable3D>
  );
}

/** The streak: a flickering full-colour flame on a white chip while alive; frosted and still before it starts. */
function StreakBadge({ streak }: { streak: number }) {
  const hot = streak > 0;
  return (
    <View style={[styles.streak, hot ? styles.streakHot : styles.streakCold]}>
      <View style={!hot && styles.fireDim}>
        <FireIcon size={18} animated={hot} />
      </View>
      <AppText color={hot ? FIRE_INK : WHITE} style={styles.streakNumber}>
        {streak}
      </AppText>
    </View>
  );
}

/**
 * One day on the ember card: a white chip with a real flame for a met goal, frosted with a tick for
 * some practice, white with the date for today, a dashed ring ahead and a faint chip for a missed day.
 */
function DayDot({ day, weekday }: { day: WeekDay; weekday: string }) {
  const number = Number(day.date.slice(8));
  const met = day.level === 4;
  const active = day.level > 0;

  let dot;
  if (met) {
    dot = (
      <View style={[styles.dot, styles.dotMet]}>
        <FireIcon size={15} animated={false} />
      </View>
    );
  } else if (day.today) {
    dot = (
      <View style={[styles.dot, styles.dotToday]}>
        {active ? (
          <Ionicons name="checkmark" size={17} color={INK} />
        ) : (
          <AppText color={INK} style={styles.dayNumber}>
            {number}
          </AppText>
        )}
      </View>
    );
  } else if (active) {
    dot = (
      <View style={[styles.dot, styles.dotActive]}>
        <Ionicons name="checkmark" size={16} color={WHITE} />
      </View>
    );
  } else if (day.future) {
    dot = (
      <View style={[styles.dot, styles.dotFuture]}>
        <AppText color="rgba(255, 255, 255, 0.85)" style={[styles.dayNumber, styles.dayNumberQuiet]}>
          {number}
        </AppText>
      </View>
    );
  } else {
    dot = (
      <View style={[styles.dot, styles.dotMissed]}>
        <AppText color="rgba(255, 255, 255, 0.75)" style={[styles.dayNumber, styles.dayNumberQuiet]}>
          {number}
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.day}>
      <AppText
        color={day.today ? WHITE : 'rgba(255, 255, 255, 0.78)'}
        style={[styles.weekday, day.today && styles.weekdayToday]}
      >
        {weekday}
      </AppText>
      <View style={styles.dotWrap}>
        {day.today && !met ? <TodayPulse /> : null}
        {dot}
      </View>
    </View>
  );
}

/** A soft white ring breathing around today, so the eye finds it first. */
function TodayPulse() {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    pulse.set(withRepeat(withTiming(1, { duration: 2000, easing: easing.out }), -1, false));
    return () => cancelAnimation(pulse);
  }, [pulse, reduceMotion]);

  const ring = useAnimatedStyle(() => ({
    opacity: 0.7 * (1 - pulse.get()),
    transform: [{ scale: 1 + pulse.get() * 0.45 }],
  }));

  return <Animated.View pointerEvents="none" style={[styles.pulse, ring]} />;
}

const TEXT_SHADOW = {
  textShadowColor: 'rgba(0, 60, 140, 0.25)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 3,
} as const;

const styles = StyleSheet.create({
  face: {
    padding: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.md,
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  orb: { position: 'absolute', borderRadius: 999 },
  orbA: { width: 210, height: 210, top: -100, right: -60, backgroundColor: 'rgba(255, 255, 255, 0.16)' },
  orbB: { width: 130, height: 130, bottom: -70, left: -50, backgroundColor: 'rgba(255, 255, 255, 0.1)' },

  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xs },
  percent: { fontSize: 14, lineHeight: 17, fontWeight: '900', ...TEXT_SHADOW },
  texts: { flex: 1, gap: 1 },
  overline: { fontSize: 10, lineHeight: 13, fontWeight: '800', letterSpacing: 1.1 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  value: { fontSize: 28, lineHeight: 32, fontWeight: '900', letterSpacing: -0.6, ...TEXT_SHADOW },
  valueOf: { flexShrink: 1, fontSize: 15, lineHeight: 19, fontWeight: '800' },
  hint: { fontSize: 12, lineHeight: 15, fontWeight: '700' },

  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.pill,
  },
  streakHot: { backgroundColor: WHITE, boxShadow: '0 4px 12px rgba(0, 70, 150, 0.25)' },
  streakCold: { backgroundColor: 'rgba(255, 255, 255, 0.25)' },
  fireDim: { opacity: 0.55 },
  streakNumber: { fontSize: 18, lineHeight: 22, fontWeight: '900' },

  tray: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  day: { alignItems: 'center', gap: 6 },
  weekday: { fontSize: 11, lineHeight: 13, fontWeight: '700', letterSpacing: 0.3 },
  weekdayToday: { fontWeight: '900' },
  dotWrap: { width: DOT, height: DOT, alignItems: 'center', justifyContent: 'center' },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, alignItems: 'center', justifyContent: 'center' },
  dotMet: { backgroundColor: WHITE, boxShadow: '0 3px 8px rgba(0, 70, 150, 0.28)' },
  dotToday: { backgroundColor: WHITE, boxShadow: '0 3px 10px rgba(0, 70, 150, 0.3)' },
  dotActive: { backgroundColor: 'rgba(255, 255, 255, 0.38)' },
  dotFuture: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255, 255, 255, 0.6)' },
  dotMissed: { backgroundColor: 'rgba(255, 255, 255, 0.16)' },
  dayNumber: { fontSize: 13, lineHeight: 16, fontWeight: '900' },
  dayNumberQuiet: { fontWeight: '700' },
  pulse: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    borderColor: WHITE,
  },
});
