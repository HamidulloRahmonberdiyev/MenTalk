import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
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
import { Pressable3D } from '@/components/ui/Pressable3D';
import { useT, type TranslationKey } from '@/i18n';
import { haptics } from '@/services/haptics';
import { radii, spacing } from '@/theme';
import { easing } from '@/theme/motion';

import { useWeek, type WeekDay } from './useWeek';

const RADIUS = 34;
const DOT = 34;
/** Ember: warmer than the green goal card, between the teal path card and the coral mistakes. */
const FACE = ['#FFB648', '#FF6B3D'] as const;
const EDGE = '#C8481E';
const DEEP = '#F0642E';
const INK = '#4A1D08';
const MUTED = '#B9876A';
const CALENDAR_ART = require('@/assets/icons3d/calendar-card.png');
const ART = 92;

/**
 * The practice calendar as a big home card, in the same chunky gradient family as the others:
 * the streak up top, this week's seven days on a white strip, and a tap into the full calendar.
 */
export function ActivityCard() {
  const t = useT();
  const week = useWeek();
  const title = week.streak > 0 ? t('activity.card.streak', { n: week.streak }) : t('activity.card.noStreak');

  return (
    <Pressable3D
      accessibilityRole="button"
      accessibilityLabel={`${t('activity.title')}. ${title}. ${t('activity.open')}`}
      onPress={() => {
        haptics.light();
        router.push('/activity');
      }}
      edgeColor={EDGE}
      depth={6}
      radius={RADIUS}
    >
      <LinearGradient colors={FACE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <View pointerEvents="none" style={[styles.orb, styles.orbA]} />
        <View pointerEvents="none" style={[styles.orb, styles.orbB]} />

        <View style={styles.head}>
          <View style={styles.headTexts}>
            <AppText color="#FFFFFF" numberOfLines={1} adjustsFontSizeToFit style={styles.title}>
              {t('activity.title')}
            </AppText>
            <View style={styles.streakRow}>
              <Ionicons name="flame" size={16} color="#FFFFFF" />
              <AppText color="rgba(255,255,255,0.95)" style={styles.subtitle} numberOfLines={1}>
                {title}
              </AppText>
            </View>
          </View>
          {/* The 3D calendar in the corner, glowing on the ember face like the home cards' art. */}
          <View style={styles.art} pointerEvents="none">
            <View style={styles.halo} />
            <View style={styles.floor} />
            <Image source={CALENDAR_ART} style={styles.artImage} contentFit="contain" transition={150} />
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.days}>
            {week.days.map((day, index) => (
              <View key={day.date} style={styles.day}>
                <AppText color={day.today ? DEEP : MUTED} style={styles.weekday}>
                  {t(`activity.wd.${index + 1}` as TranslationKey)}
                </AppText>
                <DayDot day={day} />
              </View>
            ))}
          </View>
          <View style={styles.footer}>
            <AppText color={INK} style={styles.footerText} numberOfLines={1}>
              {t('activity.card.week', { days: week.activeDays, minutes: week.minutes })}
            </AppText>
            {week.bestStreak > 0 ? (
              <View style={styles.best}>
                <Ionicons name="trophy" size={12} color={INK} />
                <AppText color={INK} style={styles.bestText}>
                  {week.bestStreak}
                </AppText>
              </View>
            ) : null}
          </View>
        </View>
      </LinearGradient>
    </Pressable3D>
  );
}

/** A practised day is a solid ember coin (a flame once the goal is met); today, still open, breathes. */
function DayDot({ day }: { day: WeekDay }) {
  if (day.level === 4) {
    return (
      <View style={[styles.dot, styles.dotDone]}>
        <Ionicons name="flame" size={18} color="#FFFFFF" />
      </View>
    );
  }
  if (day.level > 0) {
    return (
      <View style={[styles.dot, styles.dotDone]}>
        <Ionicons name="checkmark" size={18} color="#FFFFFF" />
      </View>
    );
  }
  if (day.today) return <TodayDot />;
  return (
    <View style={[styles.dot, day.future ? styles.dotFuture : styles.dotMissed]}>
      <AppText color={MUTED} style={styles.dotNumber}>
        {Number(day.date.slice(8))}
      </AppText>
    </View>
  );
}

function TodayDot() {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    pulse.set(withRepeat(withTiming(1, { duration: 1700, easing: easing.out }), -1, false));
    return () => cancelAnimation(pulse);
  }, [pulse, reduceMotion]);

  const ring = useAnimatedStyle(() => ({
    opacity: 0.7 * (1 - pulse.get()),
    transform: [{ scale: 1 + pulse.get() * 0.45 }],
  }));

  return (
    <View style={styles.todayBox}>
      <Animated.View style={[styles.todayRing, ring]} />
      <View style={[styles.dot, styles.dotToday]}>
        <Ionicons name="flame-outline" size={17} color={DEEP} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.lg,
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  orb: { position: 'absolute', borderRadius: 999 },
  orbA: { width: 190, height: 190, top: -90, right: -50, backgroundColor: 'rgba(255, 255, 255, 0.16)' },
  orbB: { width: 120, height: 120, top: 40, left: -70, backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headTexts: { flex: 1, gap: 2 },
  title: { fontSize: 28, lineHeight: 36, fontWeight: '900', letterSpacing: -0.5 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  subtitle: { flexShrink: 1, fontSize: 14, lineHeight: 19, fontWeight: '800' },
  // Taller than the texts beside it; the negative margins keep the head from growing.
  art: {
    width: ART,
    height: ART,
    marginVertical: -spacing.md,
    marginRight: -spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '8deg' }],
  },
  halo: {
    position: 'absolute',
    width: ART * 0.76,
    height: ART * 0.76,
    borderRadius: ART,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    boxShadow: '0 0 26px 10px rgba(255, 240, 220, 0.4)',
  },
  floor: {
    position: 'absolute',
    bottom: 4,
    width: ART * 0.56,
    height: 9,
    borderRadius: ART,
    backgroundColor: 'rgba(90, 25, 0, 0.22)',
    boxShadow: '0 0 10px 4px rgba(90, 25, 0, 0.16)',
  },
  artImage: { width: ART, height: ART },

  panel: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  days: { flexDirection: 'row' },
  day: { flex: 1, alignItems: 'center', gap: 6 },
  weekday: { fontSize: 11, lineHeight: 14, fontWeight: '800', letterSpacing: 0.4 },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, alignItems: 'center', justifyContent: 'center' },
  dotDone: {
    backgroundColor: DEEP,
    borderBottomWidth: 3,
    borderBottomColor: EDGE,
  },
  dotMissed: { backgroundColor: '#F6E6DC' },
  dotFuture: { borderWidth: 2, borderStyle: 'dashed', borderColor: '#EBCFBF' },
  dotNumber: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  todayBox: { width: DOT, height: DOT, alignItems: 'center', justifyContent: 'center' },
  todayRing: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 3,
    borderColor: DEEP,
  },
  dotToday: { backgroundColor: '#FFFFFF', borderWidth: 2.5, borderColor: DEEP },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F0D6C6',
  },
  footerText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  best: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: '#FFE7B8',
  },
  bestText: { fontSize: 12, lineHeight: 16, fontWeight: '800' },
});
