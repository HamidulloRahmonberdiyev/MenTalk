import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { speakText, stopSpeaking } from '@/services/speech';
import { useStudyLanguage } from '@/store/settingsStore';
import { colors, radii } from '@/theme';
import { useThemedStyles, type Palette } from '@/theme/appearance';

interface SpeakerButtonProps {
  /** The text in the studied language to read aloud. */
  text: string;
  size?: number;
  /** Read it once when the button appears. */
  autoPlay?: boolean;
}

/** Round speaker button that pronounces a word of the studied language. */
export function SpeakerButton({ text, size = 56, autoPlay = false }: SpeakerButtonProps) {
  const styles = useThemedStyles(createStyles);
  const t = useT();
  const { id: language } = useStudyLanguage();

  useEffect(() => {
    if (autoPlay) void speakText(text, language);
    return stopSpeaking;
  }, [autoPlay, text, language]);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={t('word.listen')}
      hitSlop={8}
      onPress={() => {
        haptics.light();
        void speakText(text, language);
      }}
      style={[styles.button, { width: size, height: size }]}
    >
      <Ionicons name="volume-high" size={size * 0.46} color={colors.primary} />
    </PressableScale>
  );
}

const createStyles = (home: Palette) => StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: home.primarySoft,
  },
});
