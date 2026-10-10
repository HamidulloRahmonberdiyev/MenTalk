import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInRight, ZoomIn } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { useT } from '@/i18n';
import { useSettingsStore } from '@/store/settingsStore';
import { haptics } from '@/services/haptics';
import { speakText, stopSpeaking } from '@/services/speech';
import { colors, radii, spacing } from '@/theme';

import { ChoiceExercise } from './ChoiceExercise';
import { surfaceOf } from './exercises';
import { FeedbackBar } from './FeedbackBar';
import { SessionSummary } from './SessionSummary';
import { SpellExercise } from './SpellExercise';
import { starterWords } from './starterWords';
import { usePracticeSession } from './usePracticeSession';
import { useVocabularyStore } from './vocabularyStore';

/** The word game: ten short exercises, instant feedback, combo points and a daily streak. */
export function PracticeScreen() {
  const hasWords = useVocabularyStore((state) => state.cards.length > 0);
  const [round, setRound] = useState(0);

  if (!hasWords) return <EmptyRound />;
  return <Round key={round} onAgain={() => setRound((value) => value + 1)} />;
}

function EmptyRound() {
  const t = useT();
  const language = useSettingsStore((state) => state.language);
  const addWords = useVocabularyStore((state) => state.addWords);
  return (
    <Screen>
      <View style={styles.empty}>
        <AppText style={styles.emptyIcon}>📚</AppText>
        <AppText variant="heading" style={styles.center}>
          {t('practice.empty')}
        </AppText>
        <View style={styles.actions}>
          <Button title={t('words.starter')} icon="sparkles" onPress={() => addWords(starterWords(language))} />
          <Button title={t('practice.done.back')} variant="soft" onPress={() => router.back()} />
        </View>
      </View>
    </Screen>
  );
}

function Round({ onAgain }: { onAgain: () => void }) {
  const t = useT();
  const session = usePracticeSession();
  const { exercise, answer, combo, summary } = session;

  // Hearing the word right after answering ties its sound to its meaning.
  const word = exercise ? surfaceOf(exercise.card) : null;
  const kind = exercise?.kind;
  const answeredId = answer && exercise ? exercise.id : null;
  useEffect(() => {
    if (answeredId && word && kind !== 'listen') void speakText(word, 'ru');
    return stopSpeaking;
  }, [answeredId, word, kind]);

  useEffect(() => {
    if (!answer) return;
    if (answer.correct) haptics.success();
    else haptics.error();
  }, [answer]);

  const leave = () => router.back();

  if (summary) {
    return (
      <Screen>
        <SessionSummary summary={summary} onAgain={onAgain} onDone={leave} />
      </Screen>
    );
  }

  if (!exercise) return <EmptyRound />;

  return (
    <Screen>
      <View style={styles.top}>
        <PressableScale accessibilityRole="button" accessibilityLabel={t('practice.close')} hitSlop={10} onPress={leave} style={styles.close}>
          <Ionicons name="close" size={26} color={colors.textSecondary} />
        </PressableScale>
        <View style={styles.progress}>
          <ProgressBar value={session.progress} color={colors.success} />
        </View>
        <View style={styles.comboSlot}>
          {combo >= 2 ? (
            <Animated.View key={combo} entering={ZoomIn.springify().damping(9)} style={styles.combo}>
              <AppText variant="captionStrong" color="#B45309">
                🔥 {t('practice.combo', { n: combo })}
              </AppText>
            </Animated.View>
          ) : null}
        </View>
      </View>

      <Animated.View key={`${session.index}:${exercise.id}`} entering={FadeInRight.duration(260)} style={[styles.stage, answer && styles.stageAnswered]}>
        {exercise.kind === 'spell' ? (
          <SpellExercise exercise={exercise} answer={answer} onSubmit={session.submit} />
        ) : (
          <ChoiceExercise exercise={exercise} answer={answer} onSelect={session.submit} />
        )}
      </Animated.View>

      {answer ? (
        <View style={styles.feedback} pointerEvents="box-none">
          <FeedbackBar exercise={exercise} answer={answer} onContinue={session.next} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  progress: { flex: 1 },
  comboSlot: { minWidth: 84, alignItems: 'flex-end' },
  combo: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill, backgroundColor: '#FEF3C7' },
  stage: { flex: 1, paddingBottom: spacing.lg },
  feedback: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  stageAnswered: { paddingBottom: 190 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  emptyIcon: { fontSize: 72, lineHeight: 88 },
  center: { textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: spacing.md },
});
