import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useT, type TranslationKey } from '@/i18n';
import type { ApiCalendarDay } from '@/services/api/endpoints';
import { spacing } from '@/theme';
import { usePalette } from '@/theme/appearance';

import { levelOf, monthWeeks } from './calendar';
import { DayCell } from './DayCell';

interface MonthGridProps {
  month: string;
  days: ReadonlyMap<string, ApiCalendarDay>;
  goalMinutes: number;
  today: string;
  selected: string | null;
  onSelect: (date: string) => void;
}

/** Weekday header and the month's weeks; consecutive practised days are joined into one band. */
export function MonthGrid({ month, days, goalMinutes, today, selected, onSelect }: MonthGridProps) {
  const t = useT();
  const home = usePalette();
  const level = (date: string | null) => (date ? levelOf(days.get(date), goalMinutes) : 0);

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        {Array.from({ length: 7 }, (_, index) => (
          <AppText key={index} variant="caption" color={home.textMuted} style={styles.weekday}>
            {t(`activity.wd.${index + 1}` as TranslationKey)}
          </AppText>
        ))}
      </View>
      {monthWeeks(month).map((week) => (
        <View key={week.find(Boolean)} style={styles.row}>
          {week.map((date, index) => {
            if (!date) return <View key={`empty-${index}`} style={styles.empty} />;
            const own = level(date);
            const day = days.get(date);
            const number = Number(date.slice(8));
            const summary = day
              ? `${number}: ${t('common.minutes', { n: day.minutes })}, ${day.conversations} ${t('activity.stat.talks')}, ${day.xp} XP`
              : `${number}`;
            return (
              <DayCell
                key={date}
                label={String(number)}
                level={own}
                joinLeft={own > 0 && index > 0 && level(week[index - 1]) > 0}
                joinRight={own > 0 && index < 6 && level(week[index + 1]) > 0}
                today={date === today}
                selected={date === selected}
                future={date > today}
                accessibilityLabel={summary}
                onPress={() => onSelect(date)}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 2 },
  row: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontWeight: '700', marginBottom: spacing.xs },
  empty: { flex: 1 },
});
