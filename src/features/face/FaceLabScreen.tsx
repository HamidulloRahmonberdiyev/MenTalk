import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { haptics } from '@/services/haptics';
import { colors, radii, spacing } from '@/theme';

import { AIFace } from './AIFace';
import type { FaceEmotion, FaceState } from './types';
import { useMockAudioLevel } from './useMockAudioLevel';

const STATES: readonly FaceState[] = ['idle', 'listening', 'thinking', 'speaking', 'happy', 'encouraging'];
const EMOTIONS: readonly FaceEmotion[] = ['neutral', 'happy', 'encouraging', 'curious', 'empathetic'];

/** Dev playground: drive the face with mock state, emotion and audio level. */
export function FaceLabScreen() {
  const [state, setState] = useState<FaceState>('idle');
  const [emotion, setEmotion] = useState<FaceEmotion>('neutral');
  const audioLevel = useMockAudioLevel(state === 'speaking');

  return (
    <Screen>
      <ScreenHeader title="Face lab" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.stage}>
          <AIFace state={state} emotion={emotion} audioLevel={audioLevel} size={250} />
        </View>

        <ChipGroup title="state" items={STATES} value={state} onChange={setState} />
        <ChipGroup title="emotion" items={EMOTIONS} value={emotion} onChange={setEmotion} />

        <AppText variant="caption" color={colors.textSecondary}>
          Speaking uses a mock audio level (a SharedValue). Swap it for the real playback level later.
        </AppText>
      </ScrollView>
    </Screen>
  );
}

interface ChipGroupProps<T extends string> {
  title: string;
  items: readonly T[];
  value: T;
  onChange: (value: T) => void;
}

function ChipGroup<T extends string>({ title, items, value, onChange }: ChipGroupProps<T>) {
  return (
    <View style={styles.group}>
      <AppText variant="captionStrong" color={colors.textSecondary}>
        {title}
      </AppText>
      <View style={styles.chips}>
        {items.map((item) => {
          const selected = item === value;
          return (
            <PressableScale
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                haptics.selection();
                onChange(item);
              }}
              style={[styles.chip, selected && styles.chipOn]}
            >
              <AppText variant="captionStrong" color={selected ? colors.onPrimary : colors.text}>
                {item}
              </AppText>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingVertical: spacing.lg },
  stage: {
    height: 260,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  group: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.primary },
});
