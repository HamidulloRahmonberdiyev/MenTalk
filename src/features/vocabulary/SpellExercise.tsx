import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { colors, radii, spacing } from '@/theme';

import type { Exercise } from './exercises';
import { SpeakerButton } from './SpeakerButton';
import type { Answer } from './usePracticeSession';

interface SpellExerciseProps {
  exercise: Exercise;
  answer: Answer | null;
  onSubmit: (spelled: string) => void;
}

/** Build the Russian word from scrambled letter tiles: recall without a keyboard. */
export function SpellExercise({ exercise, answer, onSubmit }: SpellExerciseProps) {
  const t = useT();
  const [picked, setPicked] = useState<number[]>([]);
  const locked = answer !== null;
  const complete = picked.length === exercise.tiles.length;
  const spelled = picked.map((tile) => exercise.tiles[tile]).join('');

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

  const slotColor = answer ? (answer.correct ? colors.success : colors.danger) : colors.primary;

  return (
    <View style={styles.wrap}>
      <AppText variant="captionStrong" color={colors.textSecondary} style={styles.question}>
        {t('practice.spell')}
      </AppText>

      <View style={styles.prompt}>
        <AppText variant="display" style={styles.center}>
          {exercise.card.translation}
        </AppText>
        <SpeakerButton text={exercise.answer} />
      </View>

      <View style={styles.slots}>
        {exercise.tiles.map((_, position) => {
          const tile = picked[position];
          return (
            <PressableScale
              key={position}
              accessibilityRole="button"
              disabled={tile === undefined || locked}
              onPress={() => remove(position)}
              style={[styles.slot, tile !== undefined && { borderColor: slotColor, backgroundColor: colors.surface }]}
            >
              {tile !== undefined ? (
                <Animated.View entering={ZoomIn.duration(140)}>
                  <AppText variant="heading" color={slotColor}>
                    {exercise.tiles[tile]}
                  </AppText>
                </Animated.View>
              ) : null}
            </PressableScale>
          );
        })}
      </View>

      <View style={styles.tiles}>
        {exercise.tiles.map((letter, tile) => (
          <PressableScale
            key={tile}
            accessibilityRole="button"
            accessibilityLabel={letter}
            disabled={locked || picked.includes(tile)}
            onPress={() => pick(tile)}
            style={[styles.tile, picked.includes(tile) && styles.tileUsed]}
          >
            <AppText variant="heading" color={picked.includes(tile) ? 'transparent' : colors.text}>
              {letter}
            </AppText>
          </PressableScale>
        ))}
      </View>

      {!locked ? <Button title={t('practice.check')} disabled={!complete} onPress={() => onSubmit(spelled)} /> : null}
    </View>
  );
}

const TILE = 48;

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: spacing.xl },
  question: { textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.8 },
  prompt: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, minHeight: 120 },
  center: { textAlign: 'center' },
  slots: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  slot: {
    width: TILE,
    height: TILE + 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.primaryTint,
  },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, minHeight: TILE },
  tile: {
    width: TILE,
    height: TILE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    boxShadow: '0 3px 0 rgba(20, 70, 100, 0.16)',
  },
  tileUsed: { backgroundColor: colors.border, boxShadow: 'none' },
});
