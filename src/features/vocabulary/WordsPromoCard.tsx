import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { colors, radii, shadows, spacing } from '@/theme';

import { countDue, useVocabularyStore } from './vocabularyStore';

/** Home shortcut into the word game. Only appears once the learner has saved words. */
export function WordsPromoCard() {
  const t = useT();
  const cards = useVocabularyStore((state) => state.cards);
  if (cards.length === 0) return null;

  const due = countDue(cards);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={t('home.words.title')}
      onPress={() => {
        haptics.light();
        router.push('/practice');
      }}
      style={styles.card}
    >
      <AppText style={styles.emoji}>🎮</AppText>
      <View style={styles.texts}>
        <AppText variant="subheading">{t('home.words.title')}</AppText>
        <AppText color={colors.textSecondary}>{due > 0 ? t('home.words.due', { n: due }) : t('words.bonus')}</AppText>
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.primary} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  emoji: { fontSize: 32, lineHeight: 40 },
  texts: { flex: 1, gap: 2 },
});
