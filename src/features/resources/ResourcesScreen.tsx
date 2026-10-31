import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_SPACE } from '@/components/navigation/FloatingTabBar';
import { AppText } from '@/components/ui/AppText';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { useSettingsStore } from '@/store/settingsStore';
import { spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { GamePickerSheet } from '../vocabulary/GamePickerSheet';
import { starterWords } from '../vocabulary/starterWords';
import { countDue, useStudyCards, useVocabularyStore } from '../vocabulary/vocabularyStore';
import { ResourceCard, type Resource } from './ResourceCard';

/** The book tab: one big colourful card per thing to practise with, as on Englify's "Resurslar". */
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

  const due = countDue(cards);
  const empty = cards.length === 0;

  const resources: Resource[] = [
    {
      key: 'game',
      title: t('words.round'),
      hint: empty ? t('words.empty.title') : due > 0 ? t('home.words.due', { n: due }) : undefined,
      icon: 'game-controller',
      gradient: ['#FB7FE6', '#C03FD9'],
      edge: '#A12BBC',
      // With nothing saved there is nothing to play; the list explains how to get words.
      onPress: () => (empty ? router.push('/word-list') : setPicking(true)),
    },
    {
      key: 'words',
      title: t('words.title'),
      hint: empty ? undefined : t('words.count', { n: cards.length }),
      icon: 'book',
      gradient: ['#C4BCF8', '#8670F0'],
      edge: '#6A4FE0',
      onPress: () => router.push('/word-list'),
    },
    {
      key: 'topics',
      title: t('home.menu.topics'),
      icon: 'mic',
      gradient: ['#5CC8FF', '#3B78F0'],
      edge: '#2B5CCB',
      onPress: () => router.push('/scenarios'),
    },
    {
      key: 'translate',
      title: t('home.menu.translate'),
      icon: 'language',
      gradient: ['#DDFB4F', '#3EDE78'],
      edge: '#2BB257',
      onPress: () => router.navigate('/translate'),
    },
    {
      key: 'history',
      title: t('home.menu.history'),
      icon: 'time',
      gradient: ['#FF9C55', '#F04641'],
      edge: '#C42B27',
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
        addWords(starterWords(studyLanguage, language));
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
        {resources.map(({ key, ...resource }) => (
          <ResourceCard key={key} {...resource} />
        ))}
      </ScrollView>
      <GamePickerSheet visible={picking} onClose={() => setPicking(false)} />
    </View>
  );
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
