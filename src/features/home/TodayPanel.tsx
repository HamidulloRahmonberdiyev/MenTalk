import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { CircularProgress } from '@/components/ui/CircularProgress';
import { FireIcon } from '@/components/ui/FireIcon';
import { PressableScale } from '@/components/ui/PressableScale';
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

const RADIUS = 28;
const RING = 66;
const RING_STROKE = 9;
const DOT = 32;
const WHITE = '#FFFFFF';
/** Deep navy ink for the date on today's white chip. */
const INK = '#1E2247';
const SOFT = 'rgba(255, 255, 255, 0.82)';

/** A violet card, lighter at the top left; the same face in both looks, only the shadow follows the page. */
const GRADIENT = ['#8B7AF0', '#6B58DC', '#5443CF'] as const;
const SHADOW = {
  light: '0 12px 26px rgba(98, 78, 220, 0.32)',
  dark: '0 12px 26px rgba(0, 0, 0, 0.42)',
} as const;

const clamp = (value: number) => Math.min(Math.max(value, 0), 1);

/**
 * The learner's day at the top of home: today's goal ring and minutes, the streak beside them, a
 * progress bar and this week as seven days. The full calendar is a tap away.
 */
export function TodayPanel({ minutes, goalMinutes }: TodayPanelProps) {
  const t = useT();
  const week = useWeek();
  const look = usePalette().appearance;
  const progress = clamp(goalMinutes > 0 ? minutes / goalMinutes : 0);
  const done = progress >= 1;
  const left = Math.max(goalMinutes - minutes, 0);
  const hot = week.streak > 0;

  const fill = useSharedValue(0);
  useEffect(() => {
    fill.set(withDelay(200, withTiming(progress, { duration: 900, easing: easing.out })));
  }, [fill, progress]);
  // A short stub stays visible at 0%, so the bar reads as a bar and not an empty groove.
  const bar = useAnimatedStyle(() => ({ width: `${Math.max(fill.get(), 0.06) * 100}%` }));

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
      // The shadow lives on the outer box: iOS clips shadows on a view that clips its children.
      style={[styles.card, { boxShadow: SHADOW[look] }]}
    >
      <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 0.7, y: 1 }} style={styles.face}>
        <View pointerEvents="none" style={styles.orb} />

        <View style={styles.top}>
          <CircularProgress
            value={progress}
            size={RING}
            strokeWidth={RING_STROKE}
            color={WHITE}
            trackColor="rgba(255, 255, 255, 0.24)"
          >
            {done ? (
              <Ionicons name="checkmark" size={28} color={WHITE} />
            ) : (
              <AppText color={WHITE} style={styles.percent}>{`${Math.round(progress * 100)}%`}</AppText>
            )}
          </CircularProgress>

          <View style={styles.texts}>
            <View style={styles.titleRow}>
              <MaterialCommunityIcons name="bullseye-arrow" size={17} color={WHITE} />
              <AppText color={WHITE} style={styles.title} numberOfLines={1}>
                {t('home.goalTitle')}
              </AppText>
            </View>
            <View style={styles.valueRow}>
              <AppText color={WHITE} style={styles.value}>
                {minutes}
              </AppText>
              <AppText color={WHITE} style={styles.valueOf} numberOfLines={1} adjustsFontSizeToFit>
                / {goalMinutes} {t('home.min')}
              </AppText>
            </View>
            <AppText color={SOFT} style={styles.hint} numberOfLines={1}>
              {done ? t('home.goalDone') : t('home.goalLeft', { n: left })}
            </AppText>
          </View>

          <View style={styles.divider} />

          <View style={styles.streak}>
            <View style={styles.streakRow}>
              <FireIcon size={22} animated={hot} />
              <AppText color={WHITE} style={styles.streakNumber}>
                {week.streak}
              </AppText>
            </View>
            <AppText color={SOFT} style={styles.streakLabel} numberOfLines={1}>
              {t('home.streakDays')}
            </AppText>
          </View>
        </View>

        <View style={styles.track}>
          <Animated.View style={[styles.fill, bar]} />
        </View>

        {/* This week on a frosted tray, so the seven days read as one strip. */}
        <View style={styles.tray}>
          {week.days.map((day, index) => (
            <DayDot key={day.date} day={day} weekday={t(`activity.wd.${index + 1}` as TranslationKey)} />
          ))}
        </View>
      </LinearGradient>
    </PressableScale>
  );
}

/**
 * One day of the week: a white chip with a real flame for a met goal, white with the date for today,
 * frosted with a tick for some practice, a faint chip for a missed day and a dashed ring ahead.
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
        <AppText color="rgba(255, 255, 255, 0.9)" style={[styles.dayNumber, styles.dayNumberQuiet]}>
          {number}
        </AppText>
      </View>
    );
  } else {
    dot = (
      <View style={[styles.dot, styles.dotMissed]}>
        <AppText color="rgba(255, 255, 255, 0.85)" style={[styles.dayNumber, styles.dayNumberQuiet]}>
          {number}
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.day}>
      <AppText color={day.today ? WHITE : SOFT} style={[styles.weekday, day.today && styles.weekdayToday]}>
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

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS },
  face: {
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    overflow: 'hidden',
  },
  // A lighter violet moon rising behind the top-right corner.
  orb: {
    position: 'absolute',
    width: 190,
    height: 190,
    top: -105,
    right: -75,
    borderRadius: 95,
    backgroundColor: 'rgba(178, 128, 255, 0.35)',
  },

  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  percent: { fontSize: 15, lineHeight: 18, fontWeight: '800' },
  texts: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { flexShrink: 1, fontSize: 14, lineHeight: 18, fontWeight: '700' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  value: { fontSize: 30, lineHeight: 35, fontWeight: '900', letterSpacing: -0.6 },
  valueOf: { flexShrink: 1, fontSize: 19, lineHeight: 24, fontWeight: '800' },
  hint: { fontSize: 12, lineHeight: 15, fontWeight: '500' },

  divider: { width: 1, alignSelf: 'stretch', marginVertical: spacing.sm, backgroundColor: 'rgba(255, 255, 255, 0.22)' },
  streak: { alignItems: 'center', gap: 2, minWidth: 64 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  streakNumber: { fontSize: 22, lineHeight: 27, fontWeight: '900' },
  streakLabel: { fontSize: 11, lineHeight: 14, fontWeight: '600' },

  // Lines up with the texts, under the ring's right edge.
  track: {
    height: 8,
    marginLeft: RING + spacing.md,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: 'rgba(255, 255, 255, 0.85)' },

  tray: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  day: { alignItems: 'center', gap: 6 },
  weekday: { fontSize: 12, lineHeight: 15, fontWeight: '600' },
  weekdayToday: { fontWeight: '800' },
  dotWrap: { width: DOT, height: DOT, alignItems: 'center', justifyContent: 'center' },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, alignItems: 'center', justifyContent: 'center' },
  dotMet: { backgroundColor: WHITE, boxShadow: '0 3px 8px rgba(40, 30, 120, 0.3)' },
  dotToday: { backgroundColor: WHITE, boxShadow: '0 4px 10px rgba(40, 30, 120, 0.35)' },
  dotActive: { backgroundColor: 'rgba(255, 255, 255, 0.34)' },
  dotFuture: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255, 255, 255, 0.8)' },
  dotMissed: { backgroundColor: 'rgba(255, 255, 255, 0.14)' },
  dayNumber: { fontSize: 13, lineHeight: 16, fontWeight: '800' },
  dayNumberQuiet: { fontWeight: '600' },
  pulse: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    borderColor: WHITE,
  },
});
