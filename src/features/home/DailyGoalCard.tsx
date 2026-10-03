import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { CircularProgress } from '@/components/ui/CircularProgress';
import { useT } from '@/i18n';
import { colors, radii, spacing } from '@/theme';

interface DailyGoalCardProps {
  minutesDone: number;
  goalMinutes: number;
}

export function DailyGoalCard({ minutesDone, goalMinutes }: DailyGoalCardProps) {
  const t = useT();
  const done = Math.floor(minutesDone);
  const reached = minutesDone >= goalMinutes;

  return (
    <LinearGradient
      colors={['#DDF2FD', '#F2FAFE']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
      accessible
      accessibilityLabel={`${t('home.goalTitle')}: ${done}/${goalMinutes}`}
    >
      <View style={styles.texts}>
        <AppText variant="captionStrong" color={colors.textSecondary}>
          {t('home.goalTitle')}
        </AppText>
        <AppText variant="subheading">🔥 {t('home.goalText', { n: goalMinutes })}</AppText>
        {reached ? (
          <AppText variant="captionStrong" color={colors.success}>
            {t('home.goalDone')}
          </AppText>
        ) : null}
      </View>
      <CircularProgress value={minutesDone / goalMinutes} size={84}>
        <AppText variant="heading" color={colors.primary}>
          {done}
          <AppText variant="caption" color={colors.textSecondary}>
            /{goalMinutes}
          </AppText>
        </AppText>
        <AppText style={styles.unit} variant="caption" color={colors.textSecondary}>
          {t('home.unit')}
        </AppText>
      </CircularProgress>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.xl,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    boxShadow: '0 8px 24px rgba(42, 171, 238, 0.10)',
  },
  texts: {
    flex: 1,
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  unit: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
  },
});
