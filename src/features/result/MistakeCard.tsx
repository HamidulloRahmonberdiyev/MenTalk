import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { useT } from '@/i18n';
import { radii, spacing } from '@/theme';
import { usePalette } from '@/theme/appearance';
import type { IconName, Mistake } from '@/types';

import { HighlightedText } from './HighlightedText';

const RED = '#FF4B4B';
const GREEN = '#58CC02';

/** What was said on a soft red line, the fix on a soft green one, and why under them. */
export function MistakeCard({ mistake }: { mistake: Mistake }) {
  const home = usePalette();
  const t = useT();
  const dark = home.appearance === 'dark';
  const note = mistake.note ?? (mistake.noteKey ? t(mistake.noteKey) : '');

  return (
    <Card style={styles.card}>
      <Line icon="close" tint={RED} soft="rgba(255, 75, 75, 0.1)">
        <HighlightedText text={mistake.wrong} mark={mistake.wrongMark} markColor={dark ? '#FF7A7A' : '#E5383B'} />
      </Line>
      <Line icon="checkmark" tint={GREEN} soft="rgba(88, 204, 2, 0.12)">
        <HighlightedText text={mistake.correct} mark={mistake.correctMark} markColor={dark ? '#89E219' : '#4CA302'} />
      </Line>
      {note ? (
        <View style={styles.note}>
          <Ionicons name="bulb" size={16} color="#FFB020" />
          <AppText variant="caption" color={home.textSecondary} style={styles.flex}>
            {note}
          </AppText>
        </View>
      ) : null}
    </Card>
  );
}

function Line({ icon, tint, soft, children }: { icon: IconName; tint: string; soft: string; children: ReactNode }) {
  return (
    <View style={[styles.line, { backgroundColor: soft }]}>
      <View style={[styles.mark, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={14} color="#FFFFFF" />
      </View>
      <View style={styles.flex}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
  },
  mark: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingHorizontal: spacing.xs, paddingTop: 2 },
});
