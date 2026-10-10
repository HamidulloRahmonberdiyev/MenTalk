import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { Button } from '@/components/ui/Button';
import { TabScreen } from '@/components/ui/TabScreen';
import { useT } from '@/i18n';
import { useSettingsStore } from '@/store/settingsStore';
import { haptics } from '@/services/haptics';
import { colors, radii, shadows, spacing } from '@/theme';

import { MASTERY_STYLE } from './masteryStyle';
import { masteryOf, type Mastery } from './srs';
import { starterWords } from './starterWords';
import { countDue, useVocabularyStore, visibleStreak } from './vocabularyStore';
import { WordRow } from './WordRow';

const ORDER: Mastery[] = ['new', 'learning', 'known', 'mastered'];

export function WordsScreen() {
  const t = useT();
  const cards = useVocabularyStore((state) => state.cards);
  const xp = useVocabularyStore((state) => state.xp);
  const streak = useVocabularyStore((state) => visibleStreak(state));
  const removeWord = useVocabularyStore((state) => state.removeWord);
  const addWords = useVocabularyStore((state) => state.addWords);
  const language = useSettingsStore((state) => state.language);

  const due = countDue(cards);
  const counts = useMemo(() => {
    const result: Record<Mastery, number> = { new: 0, learning: 0, known: 0, mastered: 0 };
    for (const card of cards) result[masteryOf(card.stage)] += 1;
    return result;
  }, [cards]);

  const play = () => {
    haptics.medium();
    router.push('/practice');
  };

  return (
    <TabScreen>
      <AppText variant="title" accessibilityRole="header">
        {t('words.title')}
      </AppText>

      <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroTexts}>
            <AppText variant="heading" color={colors.onPrimary}>
              {t('words.round')}
            </AppText>
            <AppText color="rgba(255,255,255,0.9)">
              {cards.length === 0 ? t('words.empty.title') : due > 0 ? t('words.due', { n: due }) : t('words.bonus')}
            </AppText>
          </View>
          <AppText style={styles.heroEmoji}>🎮</AppText>
        </View>
        <View style={styles.chips}>
          <Chip label={`🔥 ${t('words.streak', { n: streak })}`} />
          <Chip label={`⚡ ${t('words.xp', { n: xp })}`} />
        </View>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t('words.play')}
          disabled={cards.length === 0}
          onPress={play}
          style={[styles.play, cards.length === 0 && styles.playOff]}
        >
          <AppText variant="button" color={colors.primaryDark}>
            {t('words.play')}
          </AppText>
        </PressableScale>
      </LinearGradient>

      {cards.length === 0 ? (
        <View style={styles.empty}>
          <AppText style={styles.emptyIcon}>📖</AppText>
          <AppText variant="heading" style={styles.center}>
            {t('words.empty.title')}
          </AppText>
          <AppText color={colors.textSecondary} style={styles.center}>
            {t('words.empty.text')}
          </AppText>
          <Button
            title={t('words.starter')}
            icon="sparkles"
            onPress={() => {
              addWords(starterWords(language));
              haptics.success();
            }}
            style={styles.starter}
          />
        </View>
      ) : (
        <>
          <View style={styles.summary}>
            <AppText variant="heading">{t('words.count', { n: cards.length })}</AppText>
            <View style={styles.bar}>
              {ORDER.filter((key) => counts[key] > 0).map((key) => (
                <View key={key} style={{ flex: counts[key], backgroundColor: MASTERY_STYLE[key].color }} />
              ))}
            </View>
            <View style={styles.legend}>
              {ORDER.map((key) => (
                <View key={key} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: MASTERY_STYLE[key].color }]} />
                  <AppText variant="caption" color={colors.textSecondary}>
                    {t(MASTERY_STYLE[key].label)} {counts[key]}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.list}>
            {cards.map((card) => (
              <WordRow key={card.id} card={card} onRemove={removeWord} />
            ))}
          </View>
        </>
      )}
    </TabScreen>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <AppText variant="captionStrong" color={colors.onPrimary}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.lg, padding: spacing.xl, borderRadius: radii.xl, ...shadows.primary },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  heroTexts: { flex: 1, gap: spacing.xs },
  heroEmoji: { fontSize: 44, lineHeight: 52 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radii.pill, backgroundColor: 'rgba(255,255,255,0.22)' },
  play: { height: 54, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  playOff: { opacity: 0.55 },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxxl },
  emptyIcon: { fontSize: 64, lineHeight: 76 },
  center: { textAlign: 'center' },
  starter: { alignSelf: 'stretch', marginTop: spacing.md },
  summary: { gap: spacing.md },
  bar: { flexDirection: 'row', height: 10, borderRadius: radii.pill, overflow: 'hidden', gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  list: { gap: spacing.md },
});
