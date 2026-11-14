import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useT } from '@/i18n';
import { useSettingsStore } from '@/store/settingsStore';
import { haptics } from '@/services/haptics';
import { radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { GamePickerSheet } from './GamePickerSheet';
import { masteryStyle } from './masteryStyle';
import { masteryOf, type Mastery } from './srs';
import { starterWords } from './starterWords';
import { countDue, useStudyCards, useVocabularyStore, visibleStreak } from './vocabularyStore';
import { WordRow } from './WordRow';
import { WordsHero } from './WordsHero';

const ORDER: Mastery[] = ['new', 'learning', 'known', 'mastered'];
/** The same 3D book as the "My words" card and shortcut. */
const WORDS_ART = require('@/assets/icons3d/shortcuts/words.png');
const EMPTY_ART = 132;

export function WordListScreen() {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const t = useT();
  const cards = useStudyCards();
  const xp = useVocabularyStore((state) => state.xp);
  const streak = useVocabularyStore((state) => visibleStreak(state));
  const removeWord = useVocabularyStore((state) => state.removeWord);
  const addWords = useVocabularyStore((state) => state.addWords);
  const language = useSettingsStore((state) => state.language);
  const studyLanguage = useSettingsStore((state) => state.studyLanguage);
  const [picking, setPicking] = useState(false);

  const due = countDue(cards);
  const mastery = masteryStyle(home);
  const counts = useMemo(() => {
    const result: Record<Mastery, number> = { new: 0, learning: 0, known: 0, mastered: 0 };
    for (const card of cards) result[masteryOf(card)] += 1;
    return result;
  }, [cards]);

  const play = () => {
    haptics.medium();
    setPicking(true);
  };

  return (
    <Screen padded={false}>
      <ScreenHeader title={t('words.title')} onBack={() => router.back()} style={styles.header} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <WordsHero total={cards.length} due={due} streak={streak} xp={xp} onPlay={play} />

        {cards.length === 0 ? (
          <View style={styles.empty}>
            {/* The 3D book on a soft halo, like the art on the cards. */}
            <View style={styles.emptyArt} pointerEvents="none">
              <View style={styles.emptyHalo} />
              <Image source={WORDS_ART} style={styles.emptyImage} contentFit="contain" transition={150} />
            </View>
            <AppText variant="heading" style={styles.center}>
              {t('words.empty.title')}
            </AppText>
            <AppText color={home.textSecondary} style={styles.center}>
              {t('words.empty.text')}
            </AppText>
            <Button
              title={t('words.starter')}
              icon="sparkles"
              onPress={() => {
                addWords(starterWords(studyLanguage, language), 'lesson');
                haptics.success();
              }}
              style={styles.starter}
            />
          </View>
        ) : (
          <>
            {/* How the words are going, on one outlined card: the count, a split bar and a chip per step. */}
            <Card style={styles.summary}>
              <View style={styles.summaryHead}>
                <View style={styles.summaryBadge}>
                  <Image source={WORDS_ART} style={styles.summaryImage} contentFit="contain" />
                </View>
                <AppText variant="heading" style={styles.flex} numberOfLines={1}>
                  {t('words.count', { n: cards.length })}
                </AppText>
              </View>
              <View style={styles.bar}>
                {ORDER.filter((key) => counts[key] > 0).map((key) => (
                  <View key={key} style={[styles.segment, { flex: counts[key], backgroundColor: mastery[key].color }]} />
                ))}
              </View>
              <View style={styles.legend}>
                {ORDER.map((key) => (
                  <View key={key} style={[styles.legendItem, { backgroundColor: mastery[key].soft }]}>
                    <View style={[styles.legendDot, { backgroundColor: mastery[key].color }]} />
                    <AppText variant="caption" color={mastery[key].color} style={styles.legendLabel} numberOfLines={1}>
                      {t(mastery[key].label)}
                    </AppText>
                    <AppText variant="captionStrong" color={mastery[key].color}>
                      {counts[key]}
                    </AppText>
                  </View>
                ))}
              </View>
            </Card>

            <View style={styles.list}>
              {cards.map((card) => (
                <WordRow key={card.id} card={card} onRemove={removeWord} />
              ))}
            </View>
          </>
        )}
      </ScrollView>
      <GamePickerSheet visible={picking} onClose={() => setPicking(false)} />
    </Screen>
  );
}

const createStyles = (home: Palette) => StyleSheet.create({
  header: { paddingHorizontal: spacing.lg },
  content: { gap: spacing.lg, paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xxxl },
  flex: { flex: 1 },
  center: { textAlign: 'center' },

  empty: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.xxl, paddingHorizontal: spacing.md },
  emptyArt: { width: EMPTY_ART, height: EMPTY_ART, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  emptyHalo: {
    position: 'absolute',
    width: EMPTY_ART * 0.82,
    height: EMPTY_ART * 0.82,
    borderRadius: EMPTY_ART,
    backgroundColor: home.primarySoft,
  },
  emptyImage: { width: EMPTY_ART, height: EMPTY_ART },
  starter: { alignSelf: 'stretch', marginTop: spacing.sm },

  summary: { gap: spacing.md },
  summaryHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  summaryBadge: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: home.primarySoft,
  },
  summaryImage: { width: 36, height: 36 },
  bar: {
    flexDirection: 'row',
    height: 12,
    gap: 3,
    borderRadius: radii.pill,
    overflow: 'hidden',
    backgroundColor: home.track,
  },
  segment: { height: '100%' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontWeight: '700' },
  list: { gap: spacing.md },
});
