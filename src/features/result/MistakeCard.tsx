import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { useT } from '@/i18n';
import { colors, spacing } from '@/theme';
import type { Mistake } from '@/types';

import { HighlightedText } from './HighlightedText';

export function MistakeCard({ mistake }: { mistake: Mistake }) {
  const t = useT();
  return (
    <Card style={styles.card}>
      <View style={styles.line}>
        <Ionicons name="close-circle" size={22} color={colors.danger} />
        <HighlightedText text={mistake.wrong} mark={mistake.wrongMark} markColor={colors.danger} />
      </View>
      <View style={styles.line}>
        <Ionicons name="checkmark-circle" size={22} color={colors.success} />
        <HighlightedText text={mistake.correct} mark={mistake.correctMark} markColor={colors.primary} />
      </View>
      <AppText variant="caption" color={colors.textMuted} style={styles.note}>
        {t(mistake.note)}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  note: {
    paddingLeft: 30,
  },
});
