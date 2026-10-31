import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { colors, radii, spacing } from '@/theme';
import { usePalette } from '@/theme/appearance';
import { enter } from '@/theme/motion';

import type { Exercise } from './exercises';
import { surfaceOf } from './exercises';
import type { Answer } from './usePracticeSession';

interface FeedbackBarProps {
  exercise: Exercise;
  answer: Answer;
  onContinue: () => void;
}

/** Slides up after every answer: right or wrong, plus the word and its meaning so each answer teaches. */
export function FeedbackBar({ exercise, answer, onContinue }: FeedbackBarProps) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const good = answer.correct;
  const home = usePalette();
  const tone = good ? { bg: home.successFill, fg: home.successInk, accent: colors.success } : { bg: home.dangerFill, fg: home.dangerInk, accent: colors.danger };

  return (
    <Animated.View
      entering={enter.slideUp()}
      style={[styles.bar, { backgroundColor: tone.bg, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.row}>
        <Ionicons name={good ? 'checkmark-circle' : 'close-circle'} size={30} color={tone.accent} />
        <View style={styles.texts}>
          <AppText variant="heading" color={tone.fg}>
            {good ? t('practice.correct') : t('practice.wrong')}
          </AppText>
          {!good ? (
            <AppText variant="subheading" color={tone.fg}>
              {exercise.answer}
            </AppText>
          ) : null}
          <AppText variant="caption" color={tone.fg}>
            {surfaceOf(exercise.card)} — {exercise.card.translation}
          </AppText>
        </View>
      </View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t('practice.continue')}
        onPress={() => {
          haptics.light();
          onContinue();
        }}
        style={[styles.button, { backgroundColor: tone.accent }]}
      >
        <AppText variant="button" color={colors.onPrimary}>
          {t('practice.continue')}
        </AppText>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  texts: { flex: 1, gap: 2 },
  button: { height: 54, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
});
