import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { colors, radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import type { Lesson } from './drills';
import { MistakeContext } from './MistakeContext';
import { MistakeExplanation } from './MistakeExplanation';
import { SentenceDiff } from './SentenceDiff';

/**
 * Before a mistake is tested for the first time (or again, once forgotten): what was said, what
 * is right, what exactly changed and why. Nothing to answer; the test follows a step later.
 */
export function LessonCard({ lesson, onContinue }: { lesson: Lesson; onContinue: () => void }) {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const { mistake } = lesson;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <MistakeContext mistake={mistake} />
        <View style={styles.head}>
          <AppText variant="title" style={styles.center}>
            {mistake.lapses > 0 ? t('mistakes.lesson.again') : t('mistakes.lesson.new')}
          </AppText>
          <AppText color={home.textSecondary} style={styles.center}>
            {t('mistakes.lesson.lead')}
          </AppText>
        </View>

        <View style={styles.card}>
          <Line icon="close-circle" tint={colors.danger} label={t('mistakes.youSaid')}>
            <SentenceDiff said={mistake.said} correct={mistake.correct} side="said" variant="subheading" />
          </Line>
          <View style={styles.rule} />
          <Line icon="checkmark-circle" tint={colors.success} label={t('mistakes.right')}>
            <SentenceDiff said={mistake.said} correct={mistake.correct} side="correct" variant="subheading" />
          </Line>
        </View>

        <MistakeExplanation mistake={mistake} mode="full" />
      </ScrollView>

      <Button
        title={t('mistakes.lesson.go')}
        icon="arrow-forward"
        iconPosition="right"
        onPress={() => {
          haptics.light();
          onContinue();
        }}
      />
    </View>
  );
}

function Line({ icon, tint, label, children }: { icon: 'close-circle' | 'checkmark-circle'; tint: string; label: string; children: ReactNode }) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.line}>
      <Ionicons name={icon} size={22} color={tint} style={styles.icon} />
      <View style={styles.flex}>
        <AppText variant="caption" color={home.textMuted}>
          {label}
        </AppText>
        {children}
      </View>
    </View>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    root: { flex: 1, gap: spacing.md },
    content: { gap: spacing.xl, paddingBottom: spacing.lg },
    head: { gap: spacing.xs },
    center: { textAlign: 'center' },
    card: {
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderBottomWidth: 3,
      borderColor: home.rim,
      borderBottomColor: home.rimBottom,
      backgroundColor: home.panel,
    },
    rule: { height: StyleSheet.hairlineWidth, backgroundColor: home.divider },
    line: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
    icon: { marginTop: 2 },
    flex: { flex: 1, gap: 2 },
  });
