import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { colors, spacing } from '@/theme';
import { enter } from '@/theme/motion';

import type { RoundSummary } from './usePracticeSession';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

interface SessionSummaryProps {
  summary: RoundSummary;
  onAgain: () => void;
  onDone: () => void;
}

/** End of a round: a celebration, the points earned and the streak, then one tap to play again. */
export function SessionSummary({ summary, onAgain, onDone }: SessionSummaryProps) {
  const styles = useThemedStyles(createStyles);
  const t = useT();
  const accuracy = summary.total === 0 ? 0 : Math.round((summary.correct / summary.total) * 100);
  const trophy = accuracy === 100 ? '🏆' : accuracy >= 60 ? '🎉' : '💪';

  useEffect(() => {
    haptics.success();
  }, []);

  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <Animated.Text entering={enter.celebrate()} style={styles.trophy}>
          {trophy}
        </Animated.Text>
        <Animated.View entering={enter.rise(150)} style={styles.heroText}>
          <AppText variant="title" style={styles.center}>
            {t('practice.done.title')}
          </AppText>
          {summary.bonus > 0 ? (
            <AppText variant="bodyStrong" color={colors.warning} style={styles.center}>
              {t('practice.done.perfect', { n: summary.bonus })}
            </AppText>
          ) : null}
        </Animated.View>
      </View>

      <Animated.View entering={enter.rise(300)}>
        <Card style={styles.stats}>
          <Stat value={`+${summary.xp}`} label="XP" color={colors.warning} />
          <Stat value={`${accuracy}%`} label={t('practice.stat.accuracy')} color={colors.success} />
          <Stat value={`🔥 ${summary.streak}`} label={t('practice.stat.streak')} color={colors.primary} />
        </Card>
      </Animated.View>

      <View style={styles.footer}>
        <Button title={t('practice.done.again')} icon="refresh" onPress={onAgain} />
        <Button title={t('practice.done.back')} variant="soft" onPress={onDone} />
      </View>
    </View>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color: string }) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.stat}>
      <AppText variant="heading" color={color}>
        {value}
      </AppText>
      <AppText variant="caption" color={home.textSecondary} style={styles.center} numberOfLines={2}>
        {label}
      </AppText>
    </View>
  );
}

const createStyles = (home: Palette) => StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'space-between', gap: spacing.xl },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  heroText: { gap: spacing.sm },
  trophy: { fontSize: 96, lineHeight: 112 },
  center: { textAlign: 'center' },
  stats: { flexDirection: 'row', padding: spacing.xl },
  stat: { flex: 1, alignItems: 'center', gap: spacing.xs },
  footer: { gap: spacing.md },
});
