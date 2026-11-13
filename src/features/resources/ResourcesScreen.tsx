import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_SPACE } from '@/components/navigation/FloatingTabBar';
import { AppText } from '@/components/ui/AppText';
import { useT } from '@/i18n';
import { isApiConfigured } from '@/services/api/config';
import type { ApiMistakeSummary } from '@/services/api/endpoints';
import { haptics } from '@/services/haptics';
import { useSettingsStore } from '@/store/settingsStore';
import { spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { ActivityCard } from '../activity/ActivityCard';
import { refreshMistakeSummary, useMistakesStore } from '../mistakes/mistakesStore';
import { GamePickerSheet } from '../vocabulary/GamePickerSheet';
import { starterWords } from '../vocabulary/starterWords';
import { countDue, useStudyCards, useVocabularyStore } from '../vocabulary/vocabularyStore';
import { ResourceCard, type Resource } from './ResourceCard';

/** 3D objects shared with the home shortcuts. */
const ART = {
  game: require('@/assets/icons3d/shortcuts/game.png'),
  mistakes: require('@/assets/icons3d/shortcuts/mistakes.png'),
  words: require('@/assets/icons3d/shortcuts/words.png'),
  topics: require('@/assets/icons3d/shortcuts/topics.png'),
  pronunciation: require('@/assets/icons3d/shortcuts/pronunciation.png'),
  translate: require('@/assets/icons3d/shortcuts/translate.png'),
  history: require('@/assets/icons3d/shortcuts/history.png'),
};

/**
 * The book tab: one big card per thing to practise with, in the home cards' style and their cool
 * sky-blue-to-lavender family, so the blue 3D objects sit well on every one.
 */
export function ResourcesScreen() {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const t = useT();
  const insets = useSafeAreaInsets();
  const cards = useStudyCards();
  const addWords = useVocabularyStore((state) => state.addWords);
  const language = useSettingsStore((state) => state.language);
  const studyLanguage = useSettingsStore((state) => state.studyLanguage);
  const [picking, setPicking] = useState(false);
  const mistakes = useMistakesStore((state) => state.summaries[studyLanguage]);
  useFocusEffect(
    useCallback(() => {
      void refreshMistakeSummary(studyLanguage);
    }, [studyLanguage]),
  );

  const due = countDue(cards);
  const empty = cards.length === 0;

  const resources: Resource[] = [
    {
      key: 'game',
      title: t('words.round'),
      hint: empty ? t('words.empty.title') : due > 0 ? t('home.words.due', { n: due }) : undefined,
      icon: 'game-controller',
      image: ART.game,
      gradient: ['#3EC0FF', '#1A9DF2'],
      edge: '#0E7FD0',
      // With nothing saved there is nothing to play; the list explains how to get words.
      onPress: () => (empty ? router.push('/word-list') : setPicking(true)),
    },
    // The notebook lives on the server; without one there is nothing in it.
    ...(isApiConfigured
      ? [
          {
            key: 'mistakes',
            title: t('mistakes.title'),
            hint: mistakeHint(mistakes, t),
            icon: 'flash' as const,
            image: ART.mistakes,
            gradient: ['#9A9BF7', '#5F62E2'] as const,
            edge: '#4A4CC4',
            onPress: () => router.push('/mistakes'),
          },
        ]
      : []),
    {
      key: 'words',
      title: t('words.title'),
      hint: empty ? undefined : t('words.count', { n: cards.length }),
      icon: 'book',
      image: ART.words,
      gradient: ['#6FA8E8', '#2F6DBF'],
      edge: '#24508F',
      onPress: () => router.push('/word-list'),
    },
    {
      key: 'topics',
      title: t('home.menu.topics'),
      icon: 'mic',
      image: ART.topics,
      gradient: ['#B3A8EC', '#8C7BDD'],
      edge: '#7462CF',
      onPress: () => router.push('/scenarios'),
    },
    {
      key: 'pronunciation',
      title: t('pron.title'),
      hint: t('pron.hint'),
      icon: 'mic-circle',
      image: ART.pronunciation,
      gradient: ['#5FD3E6', '#1E9BCB'],
      edge: '#147CA6',
      onPress: () => router.push('/pronunciation'),
    },
    {
      key: 'translate',
      title: t('home.menu.translate'),
      icon: 'language',
      image: ART.translate,
      gradient: ['#86BCFF', '#4E86F0'],
      edge: '#3A68CC',
      onPress: () => router.navigate('/translate'),
    },
    {
      key: 'history',
      title: t('home.menu.history'),
      icon: 'time',
      image: ART.history,
      gradient: ['#A3B0F7', '#6B78E2'],
      edge: '#5560C6',
      onPress: () => router.navigate('/conversations'),
    },
  ];

  if (empty) {
    resources.push({
      key: 'starter',
      title: t('res.starter'),
      hint: t('words.starter'),
      icon: 'sparkles',
      gradient: ['#6A86F8', '#9A4BF0'],
      edge: '#7433C9',
      onPress: () => {
        addWords(starterWords(studyLanguage, language), 'lesson');
        haptics.success();
      },
    });
  }

  return (
    <View style={styles.root}>
      <StatusBar style={home.statusBar} />
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <AppText variant="title" color={home.text} accessibilityRole="header">
          {t('res.title')}
        </AppText>
      </View>
      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_SPACE + insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <ActivityCard />
        {resources.map(({ key, ...resource }) => (
          <ResourceCard key={key} {...resource} />
        ))}
      </ScrollView>
      <GamePickerSheet visible={picking} onClose={() => setPicking(false)} />
    </View>
  );
}

/** "3 to practise now", else how many are in the notebook, else what it is for. */
function mistakeHint(summary: ApiMistakeSummary | undefined, t: ReturnType<typeof useT>): string {
  if (summary && summary.due > 0) return t('mistakes.due', { n: summary.due });
  if (summary && summary.total > 0) return t('res.mistakes.count', { n: summary.total });
  return t('res.mistakes.hint');
}

const createStyles = (home: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: home.background },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: home.header,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: home.divider,
  },
  list: {
    gap: spacing.lg,
    padding: spacing.xl,
  },
});
