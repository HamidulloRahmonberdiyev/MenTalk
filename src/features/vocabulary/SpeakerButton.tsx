import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { speakText, stopSpeaking } from '@/services/speech';
import { colors, radii } from '@/theme';

interface SpeakerButtonProps {
  /** The Russian text to read aloud. */
  text: string;
  size?: number;
  /** Read it once when the button appears. */
  autoPlay?: boolean;
}

/** Round speaker button that pronounces a Russian word. */
export function SpeakerButton({ text, size = 56, autoPlay = false }: SpeakerButtonProps) {
  const t = useT();

  useEffect(() => {
    if (autoPlay) void speakText(text, 'ru');
    return stopSpeaking;
  }, [autoPlay, text]);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={t('word.listen')}
      hitSlop={8}
      onPress={() => {
        haptics.light();
        void speakText(text, 'ru');
      }}
      style={[styles.button, { width: size, height: size }]}
    >
      <Ionicons name="volume-high" size={size * 0.46} color={colors.primary} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
});
