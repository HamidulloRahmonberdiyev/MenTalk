import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, {
  cancelAnimation,
  FadeIn,
  FadeOut,
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
import type { IconName } from '@/types';

import { dateKey, weekOf } from '../activity/calendar';
import { useWeek, type WeekDay } from '../activity/useWeek';
import { HERO } from './heroColors';

/** How many weeks back the strip can be swiped. */
const WEEKS = 12;
/** Pages oldest first, each one a number of weeks before this one; the last page is this week. */
const PAGES = Array.from({ length: WEEKS }, (_, index) => WEEKS - 1 - index);
const LAST = WEEKS - 1;

const openActivity = () => {
  haptics.light();
  router.push('/activity');
};

/** The Thursday of the week `weeksBack` weeks ago: the month it falls in names the week. */
function weekMonth(weeksBack: number) {
  const now = new Date();
  const thursday = weekOf(dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - weeksBack * 7)))[3];
  return { month: Number(thursday.slice(5, 7)), year: thursday.slice(0, 4) };
}

/**
 * The practice week on the home hero: seven day circles that swipe sideways, a week per page, back
 * through the last few weeks. Arrows step a week, "Today" jumps home, the month and streak open the calendar.
 */
export function WeekStrip() {
  const t = useT();
  const current = useWeek();
  const list = useRef<FlatList<number>>(null);
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(LAST);
  const { month, year } = weekMonth(PAGES[page]);
  const hot = current.streak > 0;

  const goTo = useCallback((index: number) => {
    const target = Math.min(Math.max(index, 0), LAST);
    haptics.selection();
    setPage(target);
    list.current?.scrollToIndex({ index: target, animated: true });
  }, []);

  const onSettle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    if (index !== page) {
      haptics.selection();
      setPage(index);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View style={styles.nav}>
          <NavButton icon="chevron-back" label={t('activity.prevWeek')} disabled={page === 0} onPress={() => goTo(page - 1)} />
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`${t('activity.title')}. ${t('activity.open')}`}
            onPress={openActivity}
            style={styles.monthRow}
          >
            <Ionicons name="calendar-clear" size={14} color="#FFFFFF" />
            <AppText color="#FFFFFF" style={styles.month} numberOfLines={1}>
              {t(`activity.month.${month}` as TranslationKey)} {year}
            </AppText>
          </PressableScale>
          <NavButton icon="chevron-forward" label={t('activity.nextWeek')} disabled={page === LAST} onPress={() => goTo(page + 1)} />
        </View>

        <View style={styles.headRight}>
          {page !== LAST && (
            <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)}>
              <PressableScale accessibilityRole="button" onPress={() => goTo(LAST)} style={styles.todayChip}>
                <AppText color={HERO.deep} style={styles.todayText}>
                  {t('activity.today')}
                </AppText>
              </PressableScale>
            </Animated.View>
          )}
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`${t('activity.card.streak', { n: current.streak })}. ${t('activity.open')}`}
            onPress={openActivity}
            style={[styles.streak, hot && styles.streakHot]}
          >
            <Ionicons name="flame" size={14} color={hot ? HERO.flame : HERO.faint} />
            <AppText color="#FFFFFF" style={styles.streakText}>
              {current.streak}
            </AppText>
          </PressableScale>
        </View>
      </View>

      {/* Bleeds to the screen edges so a swipe carries the week fully off screen. */}
      <View style={styles.pager} onLayout={(event) => setWidth(Math.round(event.nativeEvent.layout.width))}>
        {width > 0 && (
          <FlatList
            ref={list}
            data={PAGES}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={String}
            renderItem={({ item }) => <WeekPage weeksBack={item} width={width} />}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            initialScrollIndex={LAST}
            initialNumToRender={2}
            maxToRenderPerBatch={2}
            windowSize={3}
            onMomentumScrollEnd={onSettle}
          />
        )}
      </View>
    </View>
  );
}

function NavButton({ icon, label, disabled, onPress }: { icon: IconName; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={6}
      scaleTo={0.9}
      onPress={onPress}
      style={[styles.navButton, disabled && styles.navDisabled]}
    >
      <Ionicons name={icon} size={15} color="#FFFFFF" />
    </PressableScale>
  );
}

/** One page: the seven days of a week; tapping it opens the calendar. */
function WeekPage({ weeksBack, width }: { weeksBack: number; width: number }) {
  const t = useT();
  const week = useWeek(weeksBack);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t('activity.card.week', { days: week.activeDays, minutes: week.minutes })}. ${t('activity.open')}`}
      onPress={openActivity}
      style={[styles.days, { width }]}
    >
      {week.days.map((day, index) => (
        <DayTile key={day.date} day={day} weekday={t(`activity.wd.${index + 1}` as TranslationKey)} />
      ))}
    </Pressable>
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
  wrap: { gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  nav: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  navButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  navDisabled: { opacity: 0.35 },
  monthRow: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  month: { flexShrink: 1, fontSize: 15, lineHeight: 20, fontWeight: '800', letterSpacing: 0.2 },
  headRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  todayChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 4px 10px rgba(8, 70, 130, 0.25)',
  },
  todayText: { fontSize: 12, lineHeight: 16, fontWeight: '900' },
  pager: { marginHorizontal: -spacing.xl, minHeight: 74 },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  streakHot: { backgroundColor: 'rgba(255,170,20,0.35)', borderColor: 'rgba(255,220,120,0.8)' },
  streakText: { fontSize: 13, lineHeight: 17, fontWeight: '800' },
  days: { flexDirection: 'row', paddingHorizontal: spacing.xl },
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
