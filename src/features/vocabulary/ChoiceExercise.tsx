import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT, type TranslationKey } from '@/i18n';
import { colors, radii, spacing } from '@/theme';

import type { Exercise } from './exercises';
import { surfaceOf } from './exercises';
import type { Answer } from './usePracticeSession';
import { SpeakerButton } from './SpeakerButton';

interface ChoiceExerciseProps {
  exercise: Exercise;
  answer: Answer | null;
  onSelect: (option: string) => void;
}

const QUESTION: Record<'choice' | 'reverse' | 'listen' | 'cloze', TranslationKey> = {
  choice: 'practice.choice',
  reverse: 'practice.reverse',
  listen: 'practice.listen',
  cloze: 'practice.cloze',
};

/** Multiple choice in four flavours: meaning, reverse, listening and fill-in-the-blank. */
export function ChoiceExercise({ exercise, answer, onSelect }: ChoiceExerciseProps) {
  const t = useT();
  const { kind, card } = exercise;
  const word = surfaceOf(card);

  return (
    <View style={styles.wrap}>
      <AppText variant="captionStrong" color={colors.textSecondary} style={styles.question}>
        {t(QUESTION[kind as keyof typeof QUESTION])}
      </AppText>

      <View style={styles.prompt}>
        {kind === 'choice' ? (
          <>
            <AppText variant="display" style={styles.center}>
              {word}
            </AppText>
            <SpeakerButton text={word} />
          </>
        ) : null}
        {kind === 'reverse' ? (
          <AppText variant="display" style={styles.center}>
            {card.translation}
          </AppText>
        ) : null}
        {kind === 'listen' ? <SpeakerButton text={word} size={88} autoPlay /> : null}
        {kind === 'cloze' ? (
          <>
            <AppText variant="title" style={styles.center}>
              {exercise.sentence}
            </AppText>
            <AppText color={colors.textSecondary} style={styles.center}>
              {card.translation}
            </AppText>
          </>
        ) : null}
      </View>

      <View style={styles.options}>
        {exercise.options.map((option, index) => (
          <Option
            key={option}
            index={index}
            label={option}
            state={optionState(option, exercise.answer, answer)}
            onPress={() => onSelect(option)}
            locked={answer !== null}
          />
        ))}
      </View>
    </View>
  );
}

type OptionState = 'idle' | 'correct' | 'wrong' | 'dimmed';

function optionState(option: string, correct: string, answer: Answer | null): OptionState {
  if (!answer) return 'idle';
  if (option === correct) return 'correct';
  return option === answer.given ? 'wrong' : 'dimmed';
}

interface OptionProps {
  label: string;
  index: number;
  state: OptionState;
  locked: boolean;
  onPress: () => void;
}

function Option({ label, index, state, locked, onPress }: OptionProps) {
  const shake = useSharedValue(0);
  useEffect(() => {
    if (state === 'wrong') {
      shake.value = withSequence(withTiming(-8, { duration: 60 }), withTiming(8, { duration: 90 }), withTiming(-5, { duration: 80 }), withTiming(0, { duration: 60 }));
    }
  }, [state, shake]);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const tone = {
    idle: { bg: colors.surface, border: colors.border, text: colors.text },
    correct: { bg: '#E3F8EE', border: colors.success, text: '#0F7A4B' },
    wrong: { bg: '#FDE8E8', border: colors.danger, text: '#B42318' },
    dimmed: { bg: colors.surface, border: colors.border, text: colors.textMuted },
  }[state];

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(260)} style={shakeStyle}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={locked}
        onPress={onPress}
        style={[styles.option, { backgroundColor: tone.bg, borderColor: tone.border }]}
      >
        <AppText variant="subheading" color={tone.text} style={styles.optionText}>
          {label}
        </AppText>
        {state === 'correct' ? <Ionicons name="checkmark-circle" size={24} color={colors.success} /> : null}
        {state === 'wrong' ? <Ionicons name="close-circle" size={24} color={colors.danger} /> : null}
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: spacing.xl },
  question: { textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.8 },
  prompt: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, minHeight: 140 },
  center: { textAlign: 'center' },
  options: { gap: spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 60,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 2,
  },
  optionText: { flex: 1 },
});
