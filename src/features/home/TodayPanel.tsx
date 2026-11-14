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
import { Pressable3D } from '@/components/ui/Pressable3D';
import { useT, type TranslationKey } from '@/i18n';
import { haptics } from '@/services/haptics';
import { radii, spacing } from '@/theme';
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
const DEPTH = 6;
const WHITE = '#FFFFFF';
/** Deep green ink for the date on today's white chip. */
const INK = '#2E7D00';
/** Secondary text: a touch stronger than on the old violet, since white on lime has less contrast. */
const SOFT = 'rgba(255, 255, 255, 0.92)';

/** Duolingo-style lime: mask green at the top left into feather green; the same face in both looks. */
const GRADIENT = ['#89E219', '#6ED40C', '#58CC02'] as const;
/** The chunky darker lip the face rests on and presses down onto, like the feature cards below. */
const EDGE = '#58A700';
/** A crisp 1px drop under the white figures, so they stay legible on the bright green. */
const LIFT = { textShadowColor: 'rgba(40, 110, 0, 0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 0 };

const clamp = (value: number) => Math.min(Math.max(value, 0), 1);

/**
 * The learner's day at the top of home: today's goal ring and minutes, the streak beside them, a
 * progress bar and this week as seven days. The full calendar is a tap away.
 */
export function TodayPanel({ minutes, goalMinutes }: TodayPanelProps) {
  const t = useT();
  const week = useWeek();
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
      edgeColor={EDGE}
      depth={DEPTH}
      radius={RADIUS}
    >
      <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 0.7, y: 1 }} style={styles.face}>
        <View pointerEvents="none" style={styles.orb} />

        <View style={styles.top}>
          <CircularProgress
            value={progress}
            size={RING}
            strokeWidth={RING_STROKE}
            color={WHITE}
            trackColor="rgba(40, 110, 0, 0.28)"
          >
            {done ? (
              <Ionicons name="checkmark" size={28} color={WHITE} />
            ) : (
              <AppText color={WHITE} style={[styles.percent, LIFT]}>{`${Math.round(progress * 100)}%`}</AppText>
            )}
          </CircularProgress>

          <View style={styles.texts}>
            <View style={styles.titleRow}>
              <MaterialCommunityIcons name="bullseye-arrow" size={17} color={WHITE} />
              <AppText color={WHITE} style={[styles.title, LIFT]} numberOfLines={1}>
                {t('home.goalTitle')}
              </AppText>
            </View>
            <View style={styles.valueRow}>
              <AppText color={WHITE} style={[styles.value, LIFT]}>
                {minutes}
              </AppText>
              <AppText color={WHITE} style={[styles.valueOf, LIFT]} numberOfLines={1} adjustsFontSizeToFit>
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
              <AppText color={WHITE} style={[styles.streakNumber, LIFT]}>
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

        {/* This week in a recessed groove, so the seven days read as one strip and the white chips pop. */}
        <View style={styles.tray}>
          {week.days.map((day, index) => (
            <DayDot key={day.date} day={day} weekday={t(`activity.wd.${index + 1}` as TranslationKey)} />
          ))}
        </View>
      </LinearGradient>
    </Pressable3D>
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
  face: {
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    overflow: 'hidden',
  },
  // A pale lime sun rising behind the top-right corner.
  orb: {
    position: 'absolute',
    width: 190,
    height: 190,
    top: -105,
    right: -75,
    borderRadius: 95,
    backgroundColor: 'rgba(215, 255, 140, 0.32)',
  },

  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  percent: { fontSize: 15, lineHeight: 18, fontWeight: '800' },
  texts: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { flexShrink: 1, fontSize: 14, lineHeight: 18, fontWeight: '700' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  value: { fontSize: 30, lineHeight: 35, fontWeight: '900', letterSpacing: -0.6 },
  valueOf: { flexShrink: 1, fontSize: 19, lineHeight: 24, fontWeight: '800' },
  hint: { fontSize: 12, lineHeight: 15, fontWeight: '700' },

  divider: { width: 1, alignSelf: 'stretch', marginVertical: spacing.sm, backgroundColor: 'rgba(255, 255, 255, 0.35)' },
  streak: { alignItems: 'center', gap: 2, minWidth: 64 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  streakNumber: { fontSize: 22, lineHeight: 27, fontWeight: '900' },
  streakLabel: { fontSize: 11, lineHeight: 14, fontWeight: '700' },

  // Lines up with the texts, under the ring's right edge; a darker groove, as on Duolingo's bars.
  track: {
    height: 10,
    marginLeft: RING + spacing.md,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(40, 110, 0, 0.28)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: WHITE },

  tray: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 20,
    backgroundColor: 'rgba(40, 110, 0, 0.2)',
  },
  day: { alignItems: 'center', gap: 6 },
  weekday: { fontSize: 12, lineHeight: 15, fontWeight: '700' },
  weekdayToday: { fontWeight: '900' },
  dotWrap: { width: DOT, height: DOT, alignItems: 'center', justifyContent: 'center' },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, alignItems: 'center', justifyContent: 'center' },
  // White chips sit on a short green lip, the same chunky look as the card itself.
  dotMet: { backgroundColor: WHITE, boxShadow: '0 3px 0 rgba(46, 125, 0, 0.55)' },
  dotToday: { backgroundColor: WHITE, boxShadow: '0 3px 0 rgba(46, 125, 0, 0.55)' },
  dotActive: { backgroundColor: 'rgba(255, 255, 255, 0.38)' },
  dotFuture: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255, 255, 255, 0.85)' },
  dotMissed: { backgroundColor: 'rgba(40, 110, 0, 0.22)' },
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
