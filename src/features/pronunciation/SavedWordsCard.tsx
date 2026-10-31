import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { useT } from '@/i18n';
import { radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';
import type { WordSuggestion } from '@/types';

const VIOLET = '#8A63F0';

interface SavedWordsCardProps {
  words: readonly WordSuggestion[];
  onRemove: (word: string) => void;
  delay: number;
}

/** "These words went into your word list": each with its meaning, and a cross to take it back out. */
export function SavedWordsCard({ words, onRemove, delay }: SavedWordsCardProps) {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  if (words.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify().damping(16)} layout={LinearTransition} style={styles.card}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <Ionicons name="book" size={20} color="#FFFFFF" />
        </View>
        <View style={styles.flex}>
          <AppText variant="bodyStrong" color={home.text}>
            {t('pron.saved.title', { n: words.length })}
          </AppText>
          <AppText variant="caption" color={home.textMuted}>
            {t('pron.saved.hint')}
          </AppText>
        </View>
      </View>

      <View style={styles.chips}>
        {words.map((item) => (
          <Animated.View key={item.word} layout={LinearTransition} style={styles.chip}>
            <AppText variant="captionStrong" color={home.text}>
              {item.word}
            </AppText>
            <AppText variant="caption" color={home.textMuted} numberOfLines={1} style={styles.meaning}>
              {item.translation}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('pron.saved.remove', { word: item.word })}
              hitSlop={8}
              onPress={() => onRemove(item.word)}
            >
              <Ionicons name="close-circle" size={18} color={home.textMuted} />
            </Pressable>
          </Animated.View>
        ))}
      </View>

      <Pressable accessibilityRole="link" onPress={() => router.push('/word-list')} style={styles.open}>
        <AppText variant="captionStrong" color={VIOLET}>
          {t('pron.saved.open')}
        </AppText>
        <Ionicons name="chevron-forward" size={16} color={VIOLET} />
      </Pressable>
    </Animated.View>
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
    head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    icon: { width: 38, height: 38, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: VIOLET },
    flex: { flex: 1 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      maxWidth: '100%',
      paddingLeft: spacing.md,
      paddingRight: spacing.sm,
      paddingVertical: 6,
      borderRadius: radii.pill,
      borderWidth: 2,
      borderColor: home.appearance === 'dark' ? 'rgba(138, 99, 240, 0.45)' : '#DCD2FB',
      backgroundColor: home.appearance === 'dark' ? 'rgba(138, 99, 240, 0.14)' : '#F4F0FE',
    },
    meaning: { flexShrink: 1 },
    open: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
  });
