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
        <View style={styles.streak}>
          <Ionicons name="flame" size={14} color={week.streak > 0 ? HERO.flame : HERO.faint} />
          <AppText color="#FFFFFF" style={styles.streakText}>
            {week.streak}
          </AppText>
          <Ionicons name="chevron-forward" size={14} color={HERO.muted} />
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

  if (day.today) {
    return (
      <View style={styles.cell}>
        <TodayGlow />
        <View style={[styles.tile, styles.tileToday]}>
          <AppText color={HERO.deep} style={[styles.weekday, styles.weekdayToday]}>
            {weekday}
          </AppText>
          <AppText color={HERO.deep} style={styles.number}>
            {number}
          </AppText>
          <Mark active={active} met={met} today />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.cell}>
      {active ? (
        <LinearGradient
          colors={met ? ['#3FB9F5', '#1E78C8'] : ['rgba(63,185,245,0.45)', 'rgba(30,120,200,0.35)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.tile, styles.tileActive]}
        >
          <AppText color="rgba(255,255,255,0.8)" style={styles.weekday}>
            {weekday}
          </AppText>
          <AppText color="#FFFFFF" style={styles.number}>
            {number}
          </AppText>
          <Mark active met={met} />
        </LinearGradient>
      ) : (
        <View style={[styles.tile, day.future ? styles.tileFuture : styles.tileMissed]}>
          <AppText color={day.future ? HERO.faint : HERO.muted} style={styles.weekday}>
            {weekday}
          </AppText>
          <AppText color={day.future ? HERO.faint : 'rgba(255,255,255,0.75)'} style={styles.number}>
            {number}
          </AppText>
          <Mark active={false} met={false} />
        </View>
      )}
    </View>
  );
}

/** The little sign under the date: a flame for a met goal, a dot for some practice, nothing otherwise. */
function Mark({ active, met, today }: { active: boolean; met: boolean; today?: boolean }) {
  if (met) return <Ionicons name="flame" size={13} color={HERO.flame} />;
  if (active) return <View style={[styles.mark, { backgroundColor: today ? HERO.accent : '#FFFFFF' }]} />;
  if (today) return <View style={[styles.mark, styles.markHollow]} />;
  return <View style={styles.markSpace} />;
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
    transform: [{ scale: 1 + pulse.get() * 0.18 }],
  }));

  return <Animated.View pointerEvents="none" style={[styles.glow, ring]} />;
}

const TILE_RADIUS = 16;

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
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  streakText: { fontSize: 13, lineHeight: 17, fontWeight: '800' },
  days: { flexDirection: 'row', gap: 6 },
  cell: { flex: 1 },
  tile: {
    alignItems: 'center',
    gap: 2,
    paddingTop: 6,
    paddingBottom: 7,
    borderRadius: TILE_RADIUS,
  },
  tileToday: { backgroundColor: '#FFFFFF', boxShadow: '0 8px 20px rgba(42, 171, 238, 0.45)' },
  tileActive: { borderWidth: 1, borderColor: 'rgba(140, 215, 255, 0.45)' },
  tileMissed: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  tileFuture: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderStyle: 'dashed' },
  weekday: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.3 },
  weekdayToday: { fontWeight: '800' },
  number: { fontSize: 16, lineHeight: 20, fontWeight: '800' },
  mark: { width: 6, height: 6, borderRadius: 3, marginVertical: 3.5 },
  markHollow: { borderWidth: 1.5, borderColor: HERO.accent },
  markSpace: { height: 13 },
  glow: {
    ...StyleSheet.absoluteFill,
    borderRadius: TILE_RADIUS,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
