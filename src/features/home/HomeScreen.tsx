import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Fragment, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_SPACE } from '@/components/navigation/FloatingTabBar';
import { useRefreshControl } from '@/components/ui/useRefreshControl';
import { useT } from '@/i18n';
import { SCENARIOS } from '@/mocks/scenarios';
import { useUserStore } from '@/store/userStore';
import { radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { ReminderPrompt } from '../reminders/ReminderPrompt';
import { useReminderRoute } from '../reminders/useReminderRoute';
import { usePath } from '../path/usePath';
import { openConversation } from '../scenarios/navigation';
import { GamePickerSheet } from '../vocabulary/GamePickerSheet';
import { MAX_LEVEL, levelOf } from '../vocabulary/srs';
import { countDue, useStudyCards, useVocabularyStore, visibleStreak } from '../vocabulary/vocabularyStore';
import { FeatureCard } from './FeatureCard';
import { HomeHeader } from './HomeHeader';
import { ShortcutGrid, type Shortcut } from './ShortcutGrid';
import { SkillBars, type SkillBar } from './SkillBars';
import { PathCard } from './PathCard';

/** Average of the latest conversation scores (out of 10). */
const RECENT_SCORES = 10;
/** A week of daily rounds fills the streak bar. */
const STREAK_TARGET = 7;

export function HomeScreen() {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const t = useT();
  const insets = useSafeAreaInsets();
  const { refreshControl, version } = useRefreshControl();
  const [picking, setPicking] = useState(false);
  useReminderRoute();

  const name = useUserStore((state) => state.name);
  const goalMinutes = useUserStore((state) => state.dailyGoalMinutes);
  const minutesToday = useUserStore((state) => state.minutesToday);
  const history = useUserStore((state) => state.history);
  const lastScenarioId = useUserStore((state) => state.lastScenarioId);
  const cards = useStudyCards();
  const streak = useVocabularyStore(visibleStreak);

  const due = countDue(cards);
  const recent = history.slice(0, RECENT_SCORES);
  const average = recent.length ? recent.reduce((sum, entry) => sum + entry.score, 0) / recent.length : 0;
  const stages = usePath();
  const passedStages = stages.filter((stage) => stage.status === 'passed').length;
  const openStage = stages.find((stage) => stage.status === 'open');
  const unlocked = stages.filter((stage) => stage.status !== 'locked');
  const learned = cards.length ? cards.reduce((sum, card) => sum + levelOf(card), 0) / (cards.length * MAX_LEVEL) : 0;
  const minutes = Math.floor(minutesToday);

  const bars: SkillBar[] = [
    { key: 'goal', icon: 'flag', tint: '#58CC02', label: t('home.stats.goal'), value: `${minutes}/${goalMinutes}`, progress: minutesToday / goalMinutes },
    { key: 'score', icon: 'star', tint: '#E5A100', label: t('home.stats.score'), value: recent.length ? average.toFixed(1) : '–', progress: average / 10 },
    { key: 'words', icon: 'book', tint: '#CE82FF', label: t('home.stats.words'), value: String(cards.length), progress: learned },
    { key: 'streak', icon: 'flame', tint: '#FF9600', label: t('home.stats.streak'), value: String(streak), progress: streak / STREAK_TARGET },
    { key: 'topics', icon: 'compass', tint: '#1CB0F6', label: t('home.stats.topics'), value: `${passedStages}/${stages.length}`, progress: passedStages / stages.length },
  ];

  const shortcuts = useMemo<Shortcut[]>(
    () => [
      { key: 'topics', label: t('home.menu.topics'), art: 'topics', onPress: () => router.push('/scenarios') },
      { key: 'history', label: t('home.menu.history'), art: 'chat', onPress: () => router.navigate('/conversations') },
      { key: 'words', label: t('home.menu.words'), art: 'book', onPress: () => router.navigate('/words') },
      { key: 'game', label: t('home.menu.game'), art: 'game', onPress: () => setPicking(true) },
      { key: 'translate', label: t('home.menu.translate'), art: 'translate', onPress: () => router.navigate('/translate') },
      {
        key: 'continue',
        label: t('home.menu.continue'),
        art: 'play',
        // Carries on along the path; once it is all passed, back to the last chat.
        onPress: () => openConversation(openStage?.scenario.id ?? lastScenarioId ?? SCENARIOS[0].id),
      },
      {
        key: 'random',
        label: t('home.menu.random'),
        art: 'dice',
        onPress: () => openConversation(unlocked[Math.floor(Math.random() * unlocked.length)].scenario.id),
      },
      // Profile already has its own tab, so its slot went to pronunciation practice.
      { key: 'pronunciation', label: t('pron.menu'), art: 'mic', onPress: () => router.push('/pronunciation') },
    ],
    [t, lastScenarioId, openStage, unlocked],
  );

  return (
    <View style={styles.root}>
      {/* Only this tab is dark, so the status bar flips back once another screen takes over. */}
      <StatusBar style={home.statusBar} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        <Fragment key={version}>
          <View style={styles.top}>
            <HomeHeader name={name} />
            <SkillBars bars={bars} />
          </View>

          <View style={[styles.sheet, { paddingBottom: TAB_BAR_SPACE + insets.bottom + spacing.xl }]}>
            <View style={styles.handle} />
            {/* Small shortcuts sit between the goal card and the talk card, so big cards never stack; vocabulary is the compact one. */}
            <ShortcutGrid items={shortcuts} />
            <FeatureCard
              title={t('home.talk.title')}
              icon="mic"
              gradient={['#6FA8E8', '#2F6DBF']}
              edge="#24508F"
              stats={[
                { label: t('home.talk.sessions'), value: history.length },
                { label: t('home.talk.average'), value: recent.length ? average.toFixed(1) : 0 },
                { label: t('home.talk.today'), value: minutes },
              ]}
              onPress={() => router.push('/scenarios')}
            />
            <FeatureCard
              title={t('home.vocab.title')}
              icon="library"
              gradient={['#B79BFF', '#7B4FE0']}
              edge="#5A35B8"
              compact
              stats={[
                { label: t('home.vocab.total'), value: cards.length },
                { label: t('home.vocab.due'), value: due },
                { label: t('home.vocab.streak'), value: streak },
              ]}
              onPress={() => router.navigate('/words')}
            />

            <PathCard
              stages={stages}
              onOpenPath={() => router.push('/scenarios')}
              onStart={(stage) => openConversation(stage.scenario.id)}
            />
          </View>
        </Fragment>
      </ScrollView>
      <GamePickerSheet visible={picking} onClose={() => setPicking(false)} />
      <ReminderPrompt />
    </View>
  );
}

const createStyles = (home: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: home.background },
  content: { flexGrow: 1 },
  top: {
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  sheet: {
    flexGrow: 1,
    gap: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    backgroundColor: home.sheet,
    boxShadow: home.sheetShadow,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    marginBottom: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: home.handle,
  },
});
