import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { haptics } from '@/services/haptics';
import { colors, radii, spacing } from '@/theme';

import { useTutorVoice } from '@/features/conversation/useTutorVoice';
import type { AiMessage } from '@/types';

import { TutorAvatar } from './avatar3d/TutorAvatar';
import { useLipSync } from './lipsync/useLipSync';
import type { FaceEmotion, FaceState } from './types';

const STATES: readonly FaceState[] = ['idle', 'listening', 'thinking', 'speaking', 'happy', 'encouraging', 'wink', 'surprised'];
const EMOTIONS: readonly FaceEmotion[] = ['neutral', 'happy', 'encouraging', 'curious', 'empathetic', 'surprised', 'playful'];
const LINES = [
  'Привет! Меня зовут Говори. Как у тебя дела?',
  'Отлично, молодец! Ты говоришь всё лучше и лучше.',
  'Извини, я не совсем поняла. Можешь повторить, пожалуйста?',
  'Мама мыла раму, а папа пил утренний кофе… Ух, вкусно!',
] as const;

/** Dev playground: drive the face with state and emotion, and hear lines spoken with lip-sync. */
export function FaceLabScreen() {
  const [state, setState] = useState<FaceState>('idle');
  const [emotion, setEmotion] = useState<FaceEmotion>('neutral');
  const [line, setLine] = useState<AiMessage | null>(null);
  const lipSync = useLipSync();
  const tutor = useTutorVoice(line, 'idle', lipSync);
  const shownState = tutor.speaking ? 'speaking' : state;

  return (
    <Screen>
      <ScreenHeader title="Mascot lab" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.stage}>
          <TutorAvatar state={shownState} emotion={emotion} speech={lipSync.face} size={210} />
        </View>

        <ChipGroup title="state" items={STATES} value={state} onChange={setState} />
        <ChipGroup title="emotion" items={EMOTIONS} value={emotion} onChange={setEmotion} />
        <ChipGroup
          title="say (device voice + lip-sync)"
          items={LINES.map((_, index) => `line ${index + 1}`)}
          value={line ? `line ${Number(line.id.split(':')[0]) + 1}` : ''}
          onChange={(item) => {
            const index = Number(item.split(' ')[1]) - 1;
            setLine({ id: `${index}:${Date.now()}`, text: LINES[index] });
          }}
        />
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
    height: 300,
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
