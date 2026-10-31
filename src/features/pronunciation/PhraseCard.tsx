import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { Pressable3D } from '@/components/ui/Pressable3D';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import type { StudyLanguage } from '@/services/learning';
import type { WordScore } from '@/services/pronunciation';
import { speakText } from '@/services/speech';
import { colors, radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { VERDICT_INK, verdictFill } from './verdictColors';

const WORD = /([\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*)/u;

interface Token {
  text: string;
  /** Index among the scored words, or -1 for spaces and punctuation. */
  word: number;
}

function tokenize(phrase: string): Token[] {
  let count = 0;
  return phrase
    .split(WORD)
    .filter(Boolean)
    .map((text) => ({ text, word: WORD.test(text) ? count++ : -1 }));
}

interface WordProps {
  text: string;
  order: number;
  scored: WordScore | undefined;
  scanning: boolean;
  onPress: () => void;
}

/** One tappable word. While the recording is checked the words glow in turn, like a scanner passing over them. */
function Word({ text, order, scored, scanning, onPress }: WordProps) {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const glow = useSharedValue(0);
  const reveal = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(glow);
    glow.set(0);
    if (!scanning) return;
    glow.set(
      withDelay(
        order * 90,
        withRepeat(withSequence(withTiming(1, { duration: 280 }), withTiming(0, { duration: 420 }), withDelay(600, withTiming(0, { duration: 1 }))), -1),
      ),
    );
  }, [scanning, order, glow]);

  // Colours arrive word by word, left to right.
  useEffect(() => {
    if (!scored) return;
    reveal.set(0);
    reveal.set(withDelay(order * 60, withTiming(1, { duration: 260 })));
  }, [scored, order, reveal]);

  const style = useAnimatedStyle(() => ({
    opacity: (1 - glow.get() * 0.55) * (0.4 + reveal.get() * 0.6),
    transform: [{ translateY: -glow.get() * 2 }, { scale: 0.92 + reveal.get() * 0.08 }],
  }));

  return (
    <Animated.View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={scored ? `${text}, ${t(`pron.legend.${scored.verdict}`)}` : text}
        onPress={onPress}
        hitSlop={4}
        style={[styles.word, scored && { backgroundColor: verdictFill(scored.verdict, home), borderBottomColor: VERDICT_INK[scored.verdict] }]}
      >
        <AppText style={[styles.text, scored?.omitted && styles.omitted]} color={scored ? VERDICT_INK[scored.verdict] : home.text}>
          {text}
        </AppText>
      </Pressable>
    </Animated.View>
  );
}

interface PhraseCardProps {
  phrase: string;
  language: StudyLanguage;
  words: readonly WordScore[] | null;
  scanning: boolean;
}

/** The line to read aloud. Once scored, every word turns green, yellow or red and can be tapped to hear it. */
export function PhraseCard({ phrase, language, words, scanning }: PhraseCardProps) {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const tokens = useMemo(() => tokenize(phrase), [phrase]);

  const say = (text: string, rate?: number) => {
    haptics.selection();
    void speakText(text, language, { rate });
  };

  return (
    <View style={styles.card}>
      <AppText variant="captionStrong" color={home.textMuted} style={styles.label}>
        {t('pron.read').toUpperCase()}
      </AppText>

      <View style={styles.phrase}>
        {tokens.map((token, index) =>
          token.word < 0 ? (
            token.text.trim() ? (
              <AppText key={index} style={styles.text} color={home.textMuted}>
                {token.text.trim()}
              </AppText>
            ) : null
          ) : (
            <Word
              key={`${phrase}-${index}`}
              text={token.text}
              order={token.word}
              scored={words?.[token.word]}
              scanning={scanning}
              onPress={() => say(token.text, 0.7)}
            />
          ),
        )}
      </View>

      <View style={styles.actions}>
        <Pressable3D
          accessibilityRole="button"
          accessibilityLabel={t('pron.listen')}
          onPress={() => say(phrase)}
          edgeColor="#1A84BF"
          depth={4}
          radius={radii.pill}
          faceStyle={styles.listen}
        >
          <Ionicons name="volume-high" size={20} color="#FFFFFF" />
          <AppText variant="captionStrong" color="#FFFFFF">
            {t('pron.listen')}
          </AppText>
        </Pressable3D>
        <Pressable3D
          accessibilityRole="button"
          accessibilityLabel={t('pron.slow')}
          onPress={() => say(phrase, 0.55)}
          edgeColor={home.rimBottom}
          depth={4}
          radius={radii.pill}
          faceStyle={styles.slow}
        >
          <AppText style={styles.turtle}>🐢</AppText>
          <AppText variant="captionStrong" color={home.accent}>
            {t('pron.slow')}
          </AppText>
        </Pressable3D>
        <AppText variant="caption" color={home.textMuted} style={styles.tapHint} numberOfLines={2}>
          {t('pron.tapWord')}
        </AppText>
      </View>
    </View>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    card: {
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderBottomWidth: 6,
      borderColor: home.rim,
      borderBottomColor: home.rimBottom,
      backgroundColor: home.panel,
    },
    label: { letterSpacing: 0.8 },
    phrase: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 2, rowGap: 6 },
    word: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 8, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
    text: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
    omitted: { textDecorationLine: 'line-through' },
    actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    listen: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 9, backgroundColor: colors.primary },
    slow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: 9,
      borderWidth: 2,
      borderColor: home.rim,
      backgroundColor: home.panel,
    },
    turtle: { fontSize: 16, lineHeight: 20 },
    tapHint: { flex: 1, textAlign: 'right' },
  });
