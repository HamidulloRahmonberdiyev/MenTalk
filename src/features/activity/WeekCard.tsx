import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT, type TranslationKey } from '@/i18n';
import { haptics } from '@/services/haptics';
import { radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { DayCell, FLAME } from './DayCell';
import { useWeek } from './useWeek';

/** This week at a glance, Monday to Sunday, with the streak; opens the full calendar. */
export function WeekCard() {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const { days, streak } = useWeek();
  const level = (index: number) => days[index]?.level ?? 0;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${t('activity.week')}, ${streak} ${t('activity.streakLabel')}. ${t('activity.open')}`}
      onPress={() => {
        haptics.light();
        router.push('/activity');
      }}
      style={styles.card}
    >
      <View style={styles.head}>
        <AppText variant="bodyStrong" color={home.text} style={styles.flex}>
          {t('activity.week')}
        </AppText>
        <View style={styles.streak}>
          <Ionicons name="flame" size={16} color={FLAME} />
          <AppText variant="bodyStrong" color={FLAME}>
            {streak}
          </AppText>
        </View>
        <Ionicons name="calendar" size={18} color={home.accent} />
        <Ionicons name="chevron-forward" size={18} color={home.textMuted} />
      </View>
      <View style={styles.row}>
        {days.map(({ date, today, future }, index) => (
          <View key={date} style={styles.day}>
            <AppText variant="caption" color={today ? home.accent : home.textMuted} style={styles.weekday}>
              {t(`activity.wd.${index + 1}` as TranslationKey)}
            </AppText>
            <View style={styles.cellRow}>
              <DayCell
                label={String(Number(date.slice(8)))}
                level={level(index)}
                joinLeft={level(index) > 0 && level(index - 1) > 0}
                joinRight={level(index) > 0 && level(index + 1) > 0}
                today={today}
                future={future}
                accessibilityLabel={date}
              />
            </View>
          </View>
        ))}
      </View>
    </PressableScale>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    card: {
      gap: spacing.sm,
      padding: spacing.lg,
      paddingHorizontal: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderBottomWidth: 5,
      borderColor: home.rim,
      borderBottomColor: home.rimBottom,
      backgroundColor: home.panel,
    },
    head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xs },
    flex: { flex: 1 },
    streak: { flexDirection: 'row', alignItems: 'center', gap: 2, marginRight: spacing.xs },
    row: { flexDirection: 'row' },
    day: { flex: 1, alignItems: 'stretch' },
    weekday: { textAlign: 'center', fontWeight: '700' },
    cellRow: { flexDirection: 'row' },
  });
