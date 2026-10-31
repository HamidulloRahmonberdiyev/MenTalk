import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { colors, radii, spacing } from '@/theme';

import { GamePickerSheet } from './GamePickerSheet';
import { countDue, useStudyCards } from './vocabularyStore';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

/** Home shortcut into the word game. Only appears once the learner has saved words. */
export function WordsPromoCard() {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const t = useT();
  const cards = useStudyCards();
  const [picking, setPicking] = useState(false);
  if (cards.length === 0) return null;

  const due = countDue(cards);
  return (
    <>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t('home.words.title')}
        onPress={() => {
          haptics.light();
          setPicking(true);
        }}
        style={styles.card}
      >
        <AppText style={styles.emoji}>🎮</AppText>
        <View style={styles.texts}>
          <AppText variant="subheading">{t('home.words.title')}</AppText>
          <AppText color={home.textSecondary}>{due > 0 ? t('home.words.due', { n: due }) : t('words.bonus')}</AppText>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.primary} />
      </PressableScale>
      <GamePickerSheet visible={picking} onClose={() => setPicking(false)} />
    </>
  );
}

const createStyles = (home: Palette) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: home.rim,
    borderBottomColor: home.rimBottom,
    backgroundColor: home.panel,
  },
  emoji: { fontSize: 32, lineHeight: 40 },
  texts: { flex: 1, gap: 2 },
});
