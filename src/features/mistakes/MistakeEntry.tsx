import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import type { ApiNotebookMistake } from '@/services/api/endpoints';
import { colors, radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { categoryOf } from './categories';
import { SentenceDiff } from './SentenceDiff';

/** How far along the review schedule a mistake is, as three dots. */
const STEPS = 3;
const stepsOf = (mistake: ApiNotebookMistake) => (mistake.status === 'known' ? STEPS : Math.min(mistake.repetitions, STEPS - 1));

/** One notebook entry: what was said, what is right, why, and how often it happened. */
export const MistakeEntry = memo(function MistakeEntry({ mistake, onMore }: { mistake: ApiNotebookMistake; onMore: (mistake: ApiNotebookMistake) => void }) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const t = useT();
  const category = categoryOf(mistake.category);
  const steps = stepsOf(mistake);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={[styles.topic, { backgroundColor: `${category.tint}1F` }]}>
          <Ionicons name={category.icon} size={13} color={category.tint} />
          <AppText variant="captionStrong" color={category.tint}>
            {t(category.label)}
          </AppText>
        </View>
        {mistake.occurrences > 1 ? (
          <View style={styles.repeat}>
            <Ionicons name="repeat" size={13} color={home.dangerInk} />
            <AppText variant="captionStrong" color={home.dangerInk}>
              {t('mistakes.times', { n: mistake.occurrences })}
            </AppText>
          </View>
        ) : null}
        <View style={styles.spacer} />
        <View
          style={styles.steps}
          accessible
          accessibilityLabel={mistake.status === 'known' ? t('mistakes.status.known') : t('mistakes.status.learning')}
        >
          {Array.from({ length: STEPS }, (_, index) => (
            <View key={index} style={[styles.step, { backgroundColor: index < steps ? colors.success : home.track }]} />
          ))}
        </View>
        <PressableScale accessibilityRole="button" accessibilityLabel={t('mistakes.dismiss')} hitSlop={12} onPress={() => onMore(mistake)} style={styles.more}>
          <Ionicons name="ellipsis-horizontal" size={18} color={home.textMuted} />
        </PressableScale>
      </View>

      <View style={styles.line}>
        <Ionicons name="close-circle" size={20} color={colors.danger} style={styles.icon} />
        <SentenceDiff said={mistake.said} correct={mistake.correct} side="said" variant="body" style={styles.flex} />
      </View>
      <View style={styles.line}>
        <Ionicons name="checkmark-circle" size={20} color={colors.success} style={styles.icon} />
        <SentenceDiff said={mistake.said} correct={mistake.correct} side="correct" variant="bodyStrong" style={styles.flex} />
      </View>
      {mistake.note ? (
        <AppText variant="caption" color={home.textSecondary} style={styles.note}>
          {mistake.note}
        </AppText>
      ) : null}
    </View>
  );
});

const createStyles = (home: Palette) =>
  StyleSheet.create({
    card: {
      gap: spacing.sm,
      padding: spacing.lg,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderBottomWidth: 3,
      borderColor: home.rim,
      borderBottomColor: home.rimBottom,
      backgroundColor: home.panel,
    },
    head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
    topic: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill },
    repeat: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radii.pill, backgroundColor: home.dangerFill },
    spacer: { flex: 1 },
    steps: { flexDirection: 'row', gap: 3 },
    step: { width: 14, height: 5, borderRadius: 3 },
    more: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    line: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    icon: { marginTop: 2 },
    flex: { flex: 1 },
    note: { paddingLeft: 28 },
  });
