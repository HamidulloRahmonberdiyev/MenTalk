import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ErrorView } from '@/components/ui/StateViews';
import { useT, type Translate, type TranslationKey } from '@/i18n';
import type { ApiCalendar, ApiCalendarDay } from '@/services/api/endpoints';
import { haptics } from '@/services/haptics';
import { radii, spacing } from '@/theme';
import { enter } from '@/theme/motion';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';
import type { IconName } from '@/types';

import { dateKey, levelOf, monthKey, shiftMonth } from './calendar';
import { FLAME, GREEN } from './DayCell';
import { MonthGrid } from './MonthGrid';
import { useCalendar } from './useCalendar';

const HERO = ['#FFB347', '#FF7A1A'] as const;
const HERO_EDGE = '#C9580C';
const HERO_INK = '#5A2A06';
const LEGEND = [`${GREEN}38`, `${GREEN}75`, `${GREEN}B8`, GREEN];

export const formatDay = (t: Translate, date: string) =>
  t('activity.date', { day: Number(date.slice(8)), month: t(`activity.monthOf.${Number(date.slice(5, 7))}` as TranslationKey) });

const formatMonth = (t: Translate, month: string) => `${t(`activity.month.${Number(month.slice(5))}` as TranslationKey)} ${month.slice(0, 4)}`;

/**
 * The practice calendar: the streak up top, the month as a heat map (paged by month), and what was
 * done on the day picked in it.
 */
export function ActivityScreen() {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [picked, setPicked] = useState<string | null>(null);
  const { calendar, status, retry } = useCalendar(month);

  const today = calendar?.today ?? dateKey(new Date());
  const thisMonth = today.slice(0, 7);
  const days = useMemo(() => new Map((calendar?.days ?? []).map((day) => [day.date, day])), [calendar]);
  // Paging stops at the first practised month (or this one, for a new learner) and at the current one.
  const firstMonth = calendar?.since?.slice(0, 7) ?? thisMonth;
  const canGoBack = month > firstMonth;
  const canGoForward = month < thisMonth;
  // Today in the current month, or the last practised day of a past one.
  const selected = picked?.startsWith(month) ? picked : month === thisMonth ? today : (calendar?.days.at(-1)?.date ?? null);

  const page = (delta: number) => {
    haptics.selection();
    setPicked(null);
    setMonth((current) => shiftMonth(current, delta));
  };

  return (
    <View style={styles.root}>
      <StatusBar style={home.statusBar} />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <ScreenHeader title={t('activity.title')} onBack={() => router.back()} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]} showsVerticalScrollIndicator={false}>
        <Animated.View entering={enter.rise(0)}>
          <StreakHero calendar={calendar} month={month} />
        </Animated.View>

        <Animated.View entering={enter.rise(80)} style={styles.card}>
          <View style={styles.monthRow}>
            <MonthArrow icon="chevron-back" label={t('activity.prev')} disabled={!canGoBack} onPress={() => page(-1)} />
            <View style={styles.monthTitle}>
              <AppText variant="subheading" color={home.text} accessibilityRole="header">
                {formatMonth(t, month)}
              </AppText>
              {status === 'loading' ? <ActivityIndicator size="small" color={home.textMuted} /> : null}
            </View>
            <MonthArrow icon="chevron-forward" label={t('activity.next')} disabled={!canGoForward} onPress={() => page(1)} />
          </View>

          {status === 'failed' ? (
            <ErrorView message={t('activity.loadFailed')} onRetry={retry} />
          ) : (
            <View style={status === 'loading' && styles.loading}>
              <MonthGrid
                month={month}
                days={days}
                goalMinutes={calendar?.goal_minutes ?? 0}
                today={today}
                selected={selected}
                onSelect={(date) => {
                  haptics.selection();
                  setPicked(date);
                }}
              />
            </View>
          )}

          <View style={styles.legend}>
            <AppText variant="caption" color={home.textMuted}>
              {t('activity.less')}
            </AppText>
            <View style={[styles.swatch, { backgroundColor: home.track }]} />
            {LEGEND.map((color) => (
              <View key={color} style={[styles.swatch, { backgroundColor: color }]} />
            ))}
            <AppText variant="caption" color={home.textMuted}>
              {t('activity.more')}
            </AppText>
            <View style={styles.legendGap} />
            <Ionicons name="flame" size={14} color={FLAME} />
            <AppText variant="caption" color={home.textMuted} numberOfLines={1} style={styles.flex}>
              {t('activity.goalMet')}
            </AppText>
          </View>
        </Animated.View>

        {selected && status !== 'failed' ? (
          <Animated.View entering={enter.rise(140)}>
            <DayDetail date={selected} day={days.get(selected)} today={today} goalMinutes={calendar?.goal_minutes ?? 0} />
          </Animated.View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function MonthArrow({ icon, label, disabled, onPress }: { icon: IconName; label: string; disabled: boolean; onPress: () => void }) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={[styles.arrow, disabled && styles.arrowDisabled]}
    >
      <Ionicons name={icon} size={20} color={disabled ? home.textMuted : home.accent} />
    </PressableScale>
  );
}

/** The streak, big, on the warm gradient of a flame; the month's totals on a white strip below. */
function StreakHero({ calendar, month }: { calendar: ApiCalendar | undefined; month: string }) {
  const t = useT();
  const styles = useThemedStyles(createStyles);
  const totals = calendar?.month === month ? calendar.totals : undefined;
  const stats = [
    { label: t('activity.stat.days'), value: totals?.active_days },
    { label: t('activity.stat.minutes'), value: totals?.minutes },
    { label: 'XP', value: totals?.xp },
  ];

  return (
    <View style={styles.heroOuter}>
      <LinearGradient colors={HERO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroArt} pointerEvents="none">
          <Ionicons name="flame" size={170} color="rgba(120, 40, 0, 0.18)" style={styles.heroArtShadow} />
          <Ionicons name="flame" size={170} color="rgba(255, 255, 255, 0.32)" />
        </View>

        <View style={styles.heroTop} accessible accessibilityLabel={`${calendar?.streak ?? 0} ${t('activity.streakLabel')}`}>
          <AppText color="#FFFFFF" style={styles.heroNumber}>
            {calendar?.streak ?? '–'}
          </AppText>
          <AppText color="rgba(255, 255, 255, 0.95)" style={styles.heroLabel}>
            {t('activity.streakLabel')}
          </AppText>
        </View>
        <View style={styles.bestChip}>
          <Ionicons name="trophy" size={14} color={HERO_INK} />
          <AppText color={HERO_INK} style={styles.bestText}>
            {t('activity.best', { n: calendar?.best_streak ?? 0 })}
          </AppText>
        </View>

        <View style={styles.heroStats}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.heroStat} accessible accessibilityLabel={`${stat.label}: ${stat.value ?? 0}`}>
              <AppText color={HERO_INK} style={styles.heroStatValue}>
                {stat.value ?? '–'}
              </AppText>
              <AppText color="#8A5A2E" numberOfLines={1} style={styles.heroStatLabel}>
                {stat.label}
              </AppText>
            </View>
          ))}
        </View>
      </LinearGradient>
    </View>
  );
}

interface DayDetailProps {
  date: string;
  day: ApiCalendarDay | undefined;
  today: string;
  goalMinutes: number;
}

/** What was done on the picked day, and for today what is still left of the goal. */
function DayDetail({ date, day, today, goalMinutes }: DayDetailProps) {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const isToday = date === today;
  const practised = levelOf(day, goalMinutes) > 0;
  const goalMet = levelOf(day, goalMinutes) === 4;
  const left = Math.max(0, goalMinutes - (day?.minutes ?? 0));

  const tiles: { icon: IconName; tint: string; value: number; label: string }[] = [
    { icon: 'time', tint: GREEN, value: day?.minutes ?? 0, label: t('activity.stat.minutes') },
    { icon: 'chatbubbles', tint: '#1CB0F6', value: day?.conversations ?? 0, label: t('activity.stat.talks') },
    { icon: 'flash', tint: '#FFC800', value: day?.xp ?? 0, label: 'XP' },
  ];

  const note = goalMet
    ? null
    : !practised
      ? t(isToday ? 'activity.day.todayEmpty' : 'activity.day.empty')
      : isToday && goalMinutes > 0
        ? t('activity.day.goalLeft', { n: left })
        : null;

  return (
    <View style={styles.card}>
      <View style={styles.detailHead}>
        <AppText variant="heading" color={home.text} style={styles.flex}>
          {formatDay(t, date)}
          {isToday ? <AppText variant="heading" color={home.textMuted}>{` · ${t('activity.today')}`}</AppText> : null}
        </AppText>
        {goalMet ? (
          <View style={styles.goalChip}>
            <Ionicons name="flame" size={14} color="#FFFFFF" />
            <AppText color="#FFFFFF" style={styles.goalChipText}>
              {t('activity.goalMet')}
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.tiles}>
        {tiles.map((tile) => (
          <View key={tile.label} style={styles.tile} accessible accessibilityLabel={`${tile.label}: ${tile.value}`}>
            <View style={[styles.tileIcon, { backgroundColor: `${tile.tint}22` }]}>
              <Ionicons name={tile.icon} size={18} color={tile.tint} />
            </View>
            <AppText variant="heading" color={practised ? home.text : home.textMuted}>
              {tile.value}
            </AppText>
            <AppText variant="caption" color={home.textMuted} numberOfLines={1}>
              {tile.label}
            </AppText>
          </View>
        ))}
      </View>

      {note ? (
        <AppText color={home.textSecondary} style={styles.note}>
          {note}
        </AppText>
      ) : null}
      {isToday && !goalMet ? <Button title={t('activity.start')} icon="mic" onPress={() => router.push('/scenarios')} /> : null}
    </View>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: home.background },
    flex: { flex: 1 },
    header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, backgroundColor: home.background },
    content: { gap: spacing.lg, paddingHorizontal: spacing.xl, paddingTop: spacing.sm },

    heroOuter: { borderRadius: 30, backgroundColor: HERO_EDGE, paddingBottom: 6 },
    hero: { gap: spacing.md, padding: spacing.xl, paddingTop: spacing.lg, borderRadius: 30, overflow: 'hidden' },
    heroArt: { position: 'absolute', right: -24, top: -20, transform: [{ rotate: '12deg' }] },
    heroArtShadow: { position: 'absolute', transform: [{ translateX: 8 }, { translateY: 8 }] },
    heroTop: { gap: 0 },
    heroNumber: { fontSize: 64, lineHeight: 70, fontWeight: '900', letterSpacing: -2 },
    heroLabel: { fontSize: 18, lineHeight: 22, fontWeight: '800', marginTop: -4 },
    bestChip: {
      position: 'absolute',
      top: spacing.lg,
      right: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radii.pill,
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
    },
    bestText: { fontSize: 13, lineHeight: 17, fontWeight: '800' },
    heroStats: {
      flexDirection: 'row',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.lg,
      backgroundColor: 'rgba(255, 255, 255, 0.88)',
    },
    heroStat: { flex: 1, alignItems: 'center', gap: 2 },
    heroStatValue: { fontSize: 22, lineHeight: 26, fontWeight: '800' },
    heroStatLabel: { fontSize: 12, lineHeight: 16, fontWeight: '600' },

    card: {
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radii.xl,
      borderWidth: 2,
      borderBottomWidth: 6,
      borderColor: home.rim,
      borderBottomColor: home.rimBottom,
      backgroundColor: home.panel,
    },
    monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    monthTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    arrow: {
      width: 36,
      height: 36,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: home.primarySoft,
    },
    arrowDisabled: { backgroundColor: home.track },
    loading: { opacity: 0.4 },
    legend: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: spacing.xs },
    legendGap: { width: spacing.sm },
    swatch: { width: 14, height: 14, borderRadius: 7 },

    detailHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    goalChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
      borderRadius: radii.pill,
      backgroundColor: FLAME,
    },
    goalChipText: { fontSize: 12, lineHeight: 16, fontWeight: '800' },
    tiles: { flexDirection: 'row', gap: spacing.sm },
    tile: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
      paddingVertical: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: home.track,
    },
    tileIcon: {
      width: 32,
      height: 32,
      marginBottom: spacing.xs,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    note: { textAlign: 'center' },
  });
