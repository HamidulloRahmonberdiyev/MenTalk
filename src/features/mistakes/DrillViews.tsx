import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withTiming, ZoomIn } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { colors, radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { categoryOf } from './categories';
import { sameSentence, type Drill } from './drills';
import type { DrillAnswer } from './useMistakeDrill';

interface DrillProps<K extends Drill['kind']> {
  drill: Extract<Drill, { kind: K }>;
  answer: DrillAnswer | null;
  onSubmit: (given: string) => void;
}

/** What kind of mistake this is: a hint at where to look, never the answer itself. */
function Topic({ drill }: { drill: Drill }) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const t = useT();
  const category = categoryOf(drill.mistake.category);
  return (
    <View style={styles.topicRow}>
      <View style={[styles.topic, { backgroundColor: `${category.tint}22` }]}>
        <Ionicons name={category.icon} size={14} color={category.tint} />
        <AppText variant="captionStrong" color={category.tint}>
          {t(category.label)}
        </AppText>
      </View>
      {drill.mistake.occurrences > 1 ? (
        <AppText variant="caption" color={home.textMuted}>
          {t('mistakes.times', { n: drill.mistake.occurrences })}
        </AppText>
      ) : null}
    </View>
  );
}

function Question({ text }: { text: string }) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  return (
    <AppText variant="captionStrong" color={home.textSecondary} style={styles.question}>
      {text}
    </AppText>
  );
}

/** Two sentences, the one said and the right one: pick the right one. */
export function ChoiceDrill({ drill, answer, onSubmit }: DrillProps<'choice'>) {
  const styles = useThemedStyles(createStyles);
  const t = useT();
  return (
    <View style={styles.wrap}>
      <Question text={t('mistakes.drill.choice')} />
      <Topic drill={drill} />
      <View style={styles.options}>
        {drill.options.map((option, index) => {
          const right = sameSentence(option, drill.mistake.correct);
          const state = !answer ? 'idle' : right ? 'correct' : option === answer.given ? 'wrong' : 'dimmed';
          return <SentenceOption key={option} index={index} label={option} state={state} locked={answer !== null} onPress={() => onSubmit(option)} />;
        })}
      </View>
    </View>
  );
}

type OptionState = 'idle' | 'correct' | 'wrong' | 'dimmed';

function SentenceOption({ label, index, state, locked, onPress }: { label: string; index: number; state: OptionState; locked: boolean; onPress: () => void }) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const shake = useShake(state === 'wrong');
  const tone = {
    idle: { bg: home.panel, border: home.rim, text: home.text },
    correct: { bg: home.successFill, border: colors.success, text: home.successInk },
    wrong: { bg: home.dangerFill, border: colors.danger, text: home.dangerInk },
    dimmed: { bg: home.panel, border: home.rim, text: home.textMuted },
  }[state];

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(260)} style={shake}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={locked}
        onPress={onPress}
        style={[styles.option, { backgroundColor: tone.bg, borderColor: tone.border }]}
      >
        <AppText variant="subheading" color={tone.text} style={styles.flex}>
          {label}
        </AppText>
        {state === 'correct' ? <Ionicons name="checkmark-circle" size={24} color={colors.success} /> : null}
        {state === 'wrong' ? <Ionicons name="close-circle" size={24} color={colors.danger} /> : null}
      </PressableScale>
    </Animated.View>
  );
}

/** The learner's own sentence, word by word: tap the one that is wrong. */
export function SpotDrill({ drill, answer, onSubmit }: DrillProps<'spot'>) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const t = useT();
  return (
    <View style={styles.wrap}>
      <Question text={t('mistakes.drill.spot')} />
      <Topic drill={drill} />
      <View style={styles.prompt}>
        <View style={styles.words}>
          {drill.tokens.map((token, index) => {
            const wrong = drill.wrong.includes(index);
            const picked = answer?.given === String(index);
            const tone = !answer
              ? { bg: home.panel, border: home.rim, text: home.text }
              : wrong
                ? { bg: home.dangerFill, border: colors.danger, text: home.dangerInk }
                : picked
                  ? { bg: home.panel, border: colors.warning, text: home.textMuted }
                  : { bg: home.panel, border: home.rim, text: home.textMuted };
            return (
              <WordChip
                key={`${index}:${token}`}
                index={index}
                label={token}
                tone={tone}
                shake={picked && !wrong}
                strike={answer !== null && wrong}
                disabled={answer !== null}
                onPress={() => onSubmit(String(index))}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

interface Tone {
  bg: string;
  border: string;
  text: string;
}

function WordChip({ label, index, tone, shake, strike, disabled, onPress }: { label: string; index: number; tone: Tone; shake: boolean; strike: boolean; disabled: boolean; onPress: () => void }) {
  const styles = useThemedStyles(createStyles);
  const shaking = useShake(shake);
  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(220)} style={shaking}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPress={onPress}
        style={[styles.chip, { backgroundColor: tone.bg, borderColor: tone.border }]}
      >
        <AppText variant="subheading" color={tone.text} style={strike ? styles.strike : undefined}>
          {label}
        </AppText>
      </PressableScale>
    </Animated.View>
  );
}

/** The right sentence from its words, the learner's wrong ones mixed in: producing the fix, not just seeing it. */
export function BuildDrill({ drill, answer, onSubmit }: DrillProps<'build'>) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const t = useT();
  const [picked, setPicked] = useState<number[]>([]);
  const locked = answer !== null;
  const built = picked.map((tile) => drill.bank[tile]).join(' ');

  const pick = (tile: number) => {
    if (locked || picked.includes(tile)) return;
    haptics.selection();
    setPicked((value) => [...value, tile]);
  };
  const remove = (position: number) => {
    if (locked) return;
    haptics.selection();
    setPicked((value) => value.filter((_, index) => index !== position));
  };

  const lineColor = answer ? (answer.correct ? colors.success : colors.danger) : home.rim;

  return (
    <View style={styles.wrap}>
      <Question text={t('mistakes.drill.build')} />
      <Topic drill={drill} />
      <View style={styles.said}>
        <AppText variant="caption" color={home.textMuted}>
          {t('mistakes.youSaid')}
        </AppText>
        <AppText variant="bodyStrong" color={home.textSecondary}>
          {drill.mistake.said}
        </AppText>
      </View>

      <View style={[styles.line, { borderColor: lineColor }]}>
        {picked.map((tile, position) => (
          <Animated.View key={`${tile}`} entering={ZoomIn.duration(160)}>
            <PressableScale accessibilityRole="button" accessibilityLabel={drill.bank[tile]} disabled={locked} onPress={() => remove(position)} style={[styles.chip, styles.placed]}>
              <AppText variant="subheading" color={home.text}>
                {drill.bank[tile]}
              </AppText>
            </PressableScale>
          </Animated.View>
        ))}
      </View>

      <View style={styles.words}>
        {drill.bank.map((word, tile) => {
          const used = picked.includes(tile);
          return (
            <PressableScale
              key={`${tile}:${word}`}
              accessibilityRole="button"
              accessibilityLabel={word}
              disabled={locked || used}
              onPress={() => pick(tile)}
              style={[styles.chip, used ? styles.used : { backgroundColor: home.panel, borderColor: home.rim }]}
            >
              <AppText variant="subheading" color={used ? 'transparent' : home.text}>
                {word}
              </AppText>
            </PressableScale>
          );
        })}
      </View>

      {!locked ? <Button title={t('practice.check')} disabled={picked.length === 0} onPress={() => onSubmit(built)} /> : null}
    </View>
  );
}

function useShake(active: boolean) {
  const offset = useSharedValue(0);
  useEffect(() => {
    if (active) offset.value = withSequence(withTiming(-8, { duration: 60 }), withTiming(8, { duration: 90 }), withTiming(-5, { duration: 80 }), withTiming(0, { duration: 60 }));
  }, [active, offset]);
  return useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    wrap: { flex: 1, gap: spacing.lg },
    flex: { flex: 1 },
    question: { textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.8 },
    topicRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
    topic: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radii.pill },
    prompt: { flex: 1, justifyContent: 'center' },
    options: { flex: 1, justifyContent: 'center', gap: spacing.md },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      minHeight: 72,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      borderRadius: radii.md,
      borderWidth: 2,
    },
    words: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
    chip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radii.sm, borderWidth: 2, borderBottomWidth: 4 },
    placed: { backgroundColor: home.panel, borderColor: home.rim },
    used: { backgroundColor: home.track, borderColor: home.track },
    strike: { textDecorationLine: 'line-through' },
    said: { gap: 2, padding: spacing.md, borderRadius: radii.md, backgroundColor: home.track },
    line: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignContent: 'flex-start',
      gap: spacing.sm,
      minHeight: 116,
      paddingVertical: spacing.md,
      borderBottomWidth: 2,
    },
  });
