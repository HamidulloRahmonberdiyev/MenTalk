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

import { AIFace } from './AIFace';
import { TutorAvatar } from './avatar3d/TutorAvatar';
import { useLipSync } from './lipsync/useLipSync';
import type { FaceEmotion, FaceState } from './types';
import { useMockAudioLevel } from './useMockAudioLevel';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

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
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const [state, setState] = useState<FaceState>('idle');
  const [emotion, setEmotion] = useState<FaceEmotion>('neutral');
  const [line, setLine] = useState<AiMessage | null>(null);
  const lipSync = useLipSync();
  const tutor = useTutorVoice(line, 'idle', lipSync);
  const shownState = tutor.speaking ? 'speaking' : state;
  const mockLevel = useMockAudioLevel(state === 'speaking');
  // Remounting the faces replays SOBO's Hello wave.
  const [helloKey, setHelloKey] = useState(0);

  return (
    <Screen>
      <ScreenHeader title="Mascot lab" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.stage}>
          <TutorAvatar state={shownState} emotion={emotion} speech={lipSync.face} size={210} />
        </View>

        <View style={styles.compare}>
          {(['svg', 'rive'] as const).map((variant) => (
            <View key={variant} style={styles.compareCell}>
              <AIFace key={`${variant}:${helloKey}`} variant={variant} state={state} emotion={emotion} audioLevel={mockLevel} size={150} />
              <AppText variant="captionStrong" color={home.textSecondary}>
                {variant}
              </AppText>
            </View>
          ))}
        </View>
        <PressableScale
          accessibilityRole="button"
          onPress={() => {
            haptics.selection();
            setHelloKey((key) => key + 1);
          }}
          style={styles.chip}
        >
          <AppText variant="captionStrong">replay hello (rive)</AppText>
        </PressableScale>

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
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.group}>
      <AppText variant="captionStrong" color={home.textSecondary}>
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
              <AppText variant="captionStrong" color={selected ? colors.onPrimary : home.text}>
                {item}
              </AppText>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (home: Palette) => StyleSheet.create({
  content: { gap: spacing.xl, paddingVertical: spacing.lg },
  stage: {
    height: 300,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: home.panel,
    borderWidth: 1,
    borderColor: home.rim,
  },
  compare: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingVertical: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: home.panel,
    borderWidth: 1,
    borderColor: home.rim,
  },
  compareCell: { alignItems: 'center', gap: spacing.sm },
  group: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.pill,
    backgroundColor: home.panel,
  },
  chipOn: { backgroundColor: colors.primary },
});
