import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Pressable3D } from '@/components/ui/Pressable3D';
import { useT } from '@/i18n';
import { colors, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import type { PracticePhase } from './usePronunciation';

const MIC = 84;

interface RecordDockProps {
  phase: PracticePhase;
  level: SharedValue<number>;
  onMic: () => void;
  onNext: () => void;
}

/**
 * The big mic at the bottom. While recording it turns red and a ring breathes with the voice; after a
 * result it sits beside "Next" so retrying is one tap.
 */
export function RecordDock({ phase, level, onMic, onNext }: RecordDockProps) {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const recording = phase === 'recording';
  const busy = phase === 'analyzing';
  const done = phase === 'result';

  const ring = useAnimatedStyle(() => ({
    opacity: recording ? 0.25 + level.get() * 0.5 : 0,
    transform: [{ scale: 1 + level.get() * 0.45 }],
  }));

  const hint = recording ? t('pron.recording') : busy ? t('pron.analyzing') : done ? t('pron.retryHint') : t('pron.tap');

  return (
    <View style={[styles.dock, { paddingBottom: insets.bottom + spacing.md }]}>
      <AppText variant="captionStrong" color={recording ? '#E53838' : home.textMuted} style={styles.hint} numberOfLines={2}>
        {hint}
      </AppText>
      <View style={styles.row}>
        <View style={styles.side} />
        <View style={styles.micArea}>
          <Animated.View pointerEvents="none" style={[styles.ring, ring]} />
          <Pressable3D
            accessibilityRole="button"
            accessibilityLabel={recording ? t('pron.stop') : done ? t('pron.retry') : t('pron.tap')}
            accessibilityState={{ disabled: busy, busy }}
            disabled={busy}
            onPress={onMic}
            edgeColor={recording ? '#B91C1C' : busy ? home.rimBottom : '#1A84BF'}
            depth={6}
            radius={MIC / 2}
            faceStyle={[styles.mic, recording && styles.micRecording, busy && styles.micBusy]}
          >
            <Ionicons name={recording ? 'stop' : done ? 'refresh' : 'mic'} size={recording ? 30 : 36} color={busy ? home.textMuted : '#FFFFFF'} />
          </Pressable3D>
        </View>
        <View style={styles.side}>
          {done ? <Button title={t('pron.next')} icon="arrow-forward" iconPosition="right" onPress={onNext} style={styles.next} /> : null}
        </View>
      </View>
    </View>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    dock: {
      gap: spacing.md,
      paddingTop: spacing.md,
      paddingHorizontal: spacing.xl,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: home.divider,
      backgroundColor: home.header,
    },
    hint: { textAlign: 'center', minHeight: 18 },
    row: { flexDirection: 'row', alignItems: 'center' },
    side: { flex: 1, alignItems: 'flex-end' },
    micArea: { width: MIC + 24, height: MIC + 24, alignItems: 'center', justifyContent: 'center' },
    ring: { position: 'absolute', width: MIC + 16, height: MIC + 16, borderRadius: (MIC + 16) / 2, backgroundColor: '#FF4B4B' },
    mic: { width: MIC, height: MIC, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
    micRecording: { backgroundColor: '#FF4B4B' },
    micBusy: { backgroundColor: home.track },
    next: { minWidth: 0 },
  });
