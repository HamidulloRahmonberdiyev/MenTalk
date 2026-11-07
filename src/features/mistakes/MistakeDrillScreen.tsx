import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { ErrorView, LoadingView } from '@/components/ui/StateViews';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { useSettingsStore } from '@/store/settingsStore';
import { colors, radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';
import { duration, easing, enter } from '@/theme/motion';

import { SessionSummary } from '../vocabulary/SessionSummary';
import { DrillFeedback } from './DrillFeedback';
import { BuildDrill, ChoiceDrill, SpotDrill } from './DrillViews';
import { useMistakeDrill } from './useMistakeDrill';

/** Personal practice: a short round built only from the learner's own mistakes, due ones first. */
export function MistakeDrillScreen() {
  const [round, setRound] = useState(0);
  return <Round key={round} onAgain={() => setRound((value) => value + 1)} />;
}

function Round({ onAgain }: { onAgain: () => void }) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const t = useT();
  const studyLanguage = useSettingsStore((state) => state.studyLanguage);
  const session = useMistakeDrill(studyLanguage);
  const { drill, answer, combo, summary, load } = session;

  useEffect(() => {
    if (!answer) return;
    if (answer.correct) haptics.success();
    else haptics.error();
  }, [answer]);

  const leave = () => router.back();

  if (summary) {
    return (
      <Screen>
        <SessionSummary summary={summary} onAgain={onAgain} onDone={leave} doneLabel={t('mistakes.backToNotebook')} />
      </Screen>
    );
  }

  if (load.state === 'loading') {
    return (
      <Screen>
        <LoadingView />
      </Screen>
    );
  }

  if (load.state === 'failed') {
    return (
      <Screen>
        <ErrorView message={t('mistakes.loadFailed')} onRetry={session.retry} />
      </Screen>
    );
  }

  if (load.state === 'empty' || !drill) {
    return (
      <Screen>
        <View style={styles.empty}>
          <AppText style={styles.emptyIcon}>🎯</AppText>
          <AppText variant="heading" style={styles.center}>
            {t('mistakes.drill.empty')}
          </AppText>
          <AppText color={home.textSecondary} style={styles.center}>
            {t('mistakes.empty.text')}
          </AppText>
          <View style={styles.actions}>
            <Button title={t('mistakes.empty.action')} icon="chatbubbles" onPress={() => router.replace('/scenarios')} />
            <Button title={t('practice.done.back')} variant="soft" onPress={leave} />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.top}>
        <PressableScale accessibilityRole="button" accessibilityLabel={t('practice.close')} hitSlop={10} onPress={leave} style={styles.close}>
          <Ionicons name="close" size={26} color={home.textSecondary} />
        </PressableScale>
        <View style={styles.progress}>
          <ProgressBar value={session.progress} color={colors.success} />
        </View>
        <View style={styles.comboSlot}>
          {combo >= 2 ? (
            <Animated.View key={combo} entering={enter.pop()} style={styles.combo}>
              <AppText variant="captionStrong" color="#B45309">
                🔥 {t('practice.combo', { n: combo })}
              </AppText>
            </Animated.View>
          ) : null}
        </View>
      </View>

      <Animated.View
        key={`${session.index}:${drill.id}`}
        entering={FadeInRight.duration(duration.base).easing(easing.out)}
        style={[styles.stage, answer && styles.stageAnswered]}
      >
        {drill.kind === 'choice' ? <ChoiceDrill drill={drill} answer={answer} onSubmit={session.submit} /> : null}
        {drill.kind === 'spot' ? <SpotDrill drill={drill} answer={answer} onSubmit={session.submit} /> : null}
        {drill.kind === 'build' ? <BuildDrill drill={drill} answer={answer} onSubmit={session.submit} /> : null}
      </Animated.View>

      {answer ? (
        <View style={styles.feedback} pointerEvents="box-none">
          <DrillFeedback drill={drill} answer={answer} onContinue={session.next} />
        </View>
      ) : null}
    </Screen>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
    close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    progress: { flex: 1 },
    comboSlot: { minWidth: 84, alignItems: 'flex-end' },
    combo: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill, backgroundColor: home.warningFill },
    stage: { flex: 1, paddingBottom: spacing.lg },
    stageAnswered: { paddingBottom: 220 },
    feedback: { position: 'absolute', left: 0, right: 0, bottom: 0 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
    emptyIcon: { fontSize: 72, lineHeight: 88 },
    center: { textAlign: 'center' },
    actions: { alignSelf: 'stretch', gap: spacing.md, marginTop: spacing.md },
  });
