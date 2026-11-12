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
import { PressableScale } from '@/components/ui/PressableScale';
import { useT, type TranslationKey } from '@/i18n';
import { haptics } from '@/services/haptics';
import { radii, spacing } from '@/theme';
import { easing } from '@/theme/motion';

import { useWeek, type WeekDay } from '../activity/useWeek';
import { HERO } from './heroColors';

/**
 * This week as one row of seven day tiles on the home hero: practised days glow, the goal-met
 * ones carry a flame, today stands out in white. Tapping opens the full calendar.
 */
export function WeekStrip() {
  const t = useT();
  const week = useWeek();
  const today = week.days.find((day) => day.today) ?? week.days[0];
  const month = Number(today.date.slice(5, 7));
  const year = today.date.slice(0, 4);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${t('activity.title')}. ${t('activity.card.week', { days: week.activeDays, minutes: week.minutes })}. ${t('activity.open')}`}
      scaleTo={0.98}
      onPress={() => {
        haptics.light();
        router.push('/activity');
      }}
      style={styles.wrap}
    >
      <View style={styles.head}>
        <View style={styles.monthRow}>
          <Ionicons name="calendar-clear" size={15} color={HERO.accentSoft} />
          <AppText color="#FFFFFF" style={styles.month}>
            {t(`activity.month.${month}` as TranslationKey)} {year}
          </AppText>
        </View>
        <View style={[styles.streak, week.streak > 0 && styles.streakHot]}>
          <Ionicons name="flame" size={14} color={week.streak > 0 ? HERO.flame : HERO.faint} />
          <AppText color="#FFFFFF" style={styles.streakText}>
            {week.streak}
          </AppText>
          <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
        </View>
      </View>

      <View style={styles.days}>
        {week.days.map((day, index) => (
          <DayTile key={day.date} day={day} weekday={t(`activity.wd.${index + 1}` as TranslationKey)} />
        ))}
      </View>
    </PressableScale>
  );
}

function DayTile({ day, weekday }: { day: WeekDay; weekday: string }) {
  const number = Number(day.date.slice(8));
  const active = day.level > 0;
  const met = day.level === 4;

  return (
    <View style={styles.cell}>
      <AppText
        color={day.today ? '#FFFFFF' : day.future ? HERO.faint : HERO.muted}
        style={[styles.weekday, day.today && styles.weekdayToday]}
      >
        {weekday}
      </AppText>
      <View style={styles.circleWrap}>
        {day.today && <TodayGlow />}
        <Circle number={number} active={active} met={met} today={day.today} future={day.future} />
      </View>
      <Mark active={active} met={met} today={day.today} />
    </View>
  );
}

/** The day's number in a circle: white for today, amber for a met goal, frosted for some practice. */
function Circle({ number, active, met, today, future }: { number: number; active: boolean; met: boolean; today: boolean; future: boolean }) {
  if (today) {
    return (
      <View style={[styles.circle, styles.circleToday, met ? styles.ringMet : active ? styles.ringActive : null]}>
        <AppText color={HERO.deep} style={styles.number}>
          {number}
        </AppText>
      </View>
    );
  }
  if (active) {
    return (
      <LinearGradient
        colors={met ? ['#FFD75E', '#FF9E1B'] : ['rgba(255,255,255,0.45)', 'rgba(255,255,255,0.25)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[styles.circle, met ? styles.circleMet : styles.circleActive]}
      >
        <AppText color={met ? '#4A2300' : '#FFFFFF'} style={styles.number}>
          {number}
        </AppText>
      </LinearGradient>
    );
  }
  return (
    <View style={[styles.circle, future ? styles.circleFuture : styles.circleMissed]}>
      <AppText color={future ? HERO.faint : '#FFFFFF'} style={[styles.number, styles.numberQuiet]}>
        {number}
      </AppText>
    </View>
  );
}

/** The little sign under a day: a flame for a met goal, a dot for some practice, a ring for an empty today. */
function Mark({ active, met, today }: { active: boolean; met: boolean; today: boolean }) {
  return (
    <View style={styles.markRow}>
      {met ? (
        <Ionicons name="flame" size={12} color={HERO.flame} />
      ) : active ? (
        <View style={[styles.mark, { backgroundColor: '#FFFFFF' }]} />
      ) : today ? (
        <View style={[styles.mark, styles.markHollow]} />
      ) : null}
    </View>
  );
}

/** A soft ring breathing around today's tile. */
function TodayGlow() {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    pulse.set(withRepeat(withTiming(1, { duration: 2000, easing: easing.out }), -1, false));
    return () => cancelAnimation(pulse);
  }, [pulse, reduceMotion]);

  const ring = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - pulse.get()),
    transform: [{ scale: 1 + pulse.get() * 0.35 }],
  }));

  return <Animated.View pointerEvents="none" style={[styles.glow, ring]} />;
}

/** Seven of these fit a 320pt-wide phone with room between them. */
const CIRCLE = 38;

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  month: { fontSize: 15, lineHeight: 20, fontWeight: '800', letterSpacing: 0.2 },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  streakHot: { backgroundColor: 'rgba(255,170,20,0.35)', borderColor: 'rgba(255,220,120,0.8)' },
  streakText: { fontSize: 13, lineHeight: 17, fontWeight: '800' },
  days: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', gap: 5 },
  weekday: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.3 },
  weekdayToday: { fontWeight: '900' },
  circleWrap: { width: CIRCLE, height: CIRCLE, alignItems: 'center', justifyContent: 'center' },
  circle: { width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2, alignItems: 'center', justifyContent: 'center' },
  circleToday: { backgroundColor: '#FFFFFF', boxShadow: '0 6px 16px rgba(8, 70, 130, 0.35)' },
  ringActive: { borderWidth: 2.5, borderColor: '#7FD4FF' },
  ringMet: { borderWidth: 2.5, borderColor: '#FFB020' },
  circleActive: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.7)' },
  circleMet: { borderWidth: 2, borderColor: '#FFE9A8', boxShadow: '0 5px 14px rgba(200, 110, 0, 0.4)' },
  circleMissed: { backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  circleFuture: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.45)', borderStyle: 'dashed' },
  number: { fontSize: 15, lineHeight: 19, fontWeight: '900' },
  numberQuiet: { fontWeight: '700' },
  markRow: { height: 12, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 6, height: 6, borderRadius: 3 },
  markHollow: { borderWidth: 1.5, borderColor: '#FFFFFF' },
  glow: {
    position: 'absolute',
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
