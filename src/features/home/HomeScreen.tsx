import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Fragment, useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_SPACE } from '@/components/navigation/FloatingTabBar';
import { useRefreshControl } from '@/components/ui/useRefreshControl';
import { useT } from '@/i18n';
import { isApiConfigured } from '@/services/api/config';
import { useUserStore } from '@/store/userStore';
import { radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { ReminderPrompt } from '../reminders/ReminderPrompt';
import { useReminderRoute } from '../reminders/useReminderRoute';
import { usePath } from '../path/usePath';
import { openConversation } from '../scenarios/navigation';
import { LeaderboardCard } from '../leaderboard/LeaderboardCard';
import { GamePickerSheet } from '../vocabulary/GamePickerSheet';
import { countDue, useStudyCards, useVocabularyStore, visibleStreak } from '../vocabulary/vocabularyStore';
import { AllShortcutsSheet } from './AllShortcutsSheet';
import { FeatureCard } from './FeatureCard';
import { HomeHeader } from './HomeHeader';
import { ShortcutGrid, type Shortcut } from './ShortcutGrid';
import { ShortcutRail } from './ShortcutRail';
import { PathCard } from './PathCard';
import { TodayPanel } from './TodayPanel';
import { VocabCard } from './VocabCard';

const MIC_ART = require('@/assets/icons3d/mikrafon-card.png');
/**
 * Trying a new look for the shortcuts: 'rail' is one sideways row of mini gradient cards, 'grid' the
 * previous two-row grid of floating 3D objects. Flip back to 'grid' to restore it.
 */
const SHORTCUTS_LOOK: 'rail' | 'grid' = 'rail';
/** 3D glass tiles cut from assets/icons3d/shortcuts/home-page-small-cards.png. */
const SHORTCUT_ART = {
  topics: require('@/assets/icons3d/shortcuts/topics.png'),
  history: require('@/assets/icons3d/shortcuts/history.png'),
  words: require('@/assets/icons3d/shortcuts/words.png'),
  game: require('@/assets/icons3d/shortcuts/game.png'),
  translate: require('@/assets/icons3d/shortcuts/translate.png'),
  continue: require('@/assets/icons3d/shortcuts/continue.png'),
  mistakes: require('@/assets/icons3d/shortcuts/mistakes.png'),
  pronunciation: require('@/assets/icons3d/shortcuts/pronunciation.png'),
};

/** Average of the latest conversation scores (out of 10). */
const RECENT_SCORES = 10;

export function HomeScreen() {
  const styles = useThemedStyles(createStyles);
  const home = usePalette();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { refreshControl, version } = useRefreshControl();
  const [picking, setPicking] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const closeAll = useCallback(() => setShowAll(false), []);
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
  const minutes = Math.floor(minutesToday);


  const shortcuts = useMemo<Shortcut[]>(
    () => [
      { key: 'topics', image: SHORTCUT_ART.topics, label: t('home.menu.topics'), art: 'topics', onPress: () => router.push('/scenarios') },
      { key: 'history', image: SHORTCUT_ART.history, label: t('home.menu.history'), art: 'chat', onPress: () => router.navigate('/conversations') },
      // The saved-words list itself; '/words' is the "Mashqlar" tab, not the dictionary.
      { key: 'words', image: SHORTCUT_ART.words, label: t('home.menu.words'), art: 'book', onPress: () => router.push('/word-list') },
      { key: 'game', image: SHORTCUT_ART.game, label: t('home.menu.game'), art: 'game', onPress: () => setPicking(true) },
      { key: 'translate', image: SHORTCUT_ART.translate, label: t('home.menu.translate'), art: 'translate', onPress: () => router.navigate('/translate') },
      {
        key: 'continue',
        image: SHORTCUT_ART.continue,
        label: t('home.menu.continue'),
        art: 'play',
        // Carries on along the path; once it is all passed, back to the last chat.
        onPress: () => {
          const next = openStage?.scenario.id ?? lastScenarioId ?? stages[0]?.scenario.id;
          if (next) openConversation(next);
        },
      },
      // The mistakes notebook lives on the server, so without one the slot stays a random topic.
      isApiConfigured
        ? { key: 'mistakes', image: SHORTCUT_ART.mistakes, label: t('home.menu.mistakes'), art: 'mistakes', onPress: () => router.push('/mistakes') }
        : {
            key: 'random',
            label: t('home.menu.random'),
            art: 'dice',
            onPress: () => {
              const stage = unlocked[Math.floor(Math.random() * unlocked.length)];
              if (stage) openConversation(stage.scenario.id);
            },
          },
      // Profile already has its own tab, so its slot went to pronunciation practice.
      { key: 'pronunciation', image: SHORTCUT_ART.pronunciation, label: t('pron.menu'), art: 'mic', onPress: () => router.push('/pronunciation') },
    ],
    [t, lastScenarioId, openStage, stages, unlocked],
  );

  return (
    <View style={styles.root}>
      {/* One flat page now: the status bar follows the theme like on the other screens. */}
      <StatusBar style={home.statusBar} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        <Fragment key={version}>
          <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
            <HomeHeader name={name} />
            {/* Goal, streak and this week on one lavender card; the full calendar opens from it. */}
            <TodayPanel minutes={minutes} goalMinutes={goalMinutes} />
          </View>

          <View style={[styles.sheet, { paddingBottom: TAB_BAR_SPACE + insets.bottom + spacing.xl }]}>
            {/* Small shortcuts sit between the goal card and the talk card, so big cards never stack; vocabulary is the compact one. */}
            {SHORTCUTS_LOOK === 'rail' ? (
              <ShortcutRail
                items={shortcuts}
                title={t('home.practice.title')}
                seeAllLabel={t('home.all')}
                onSeeAll={() => setShowAll(true)}
              />
            ) : (
              <ShortcutGrid items={shortcuts} />
            )}
            <FeatureCard
              title={t('home.talk.title')}
              icon="mic"
              image={MIC_ART}
              gradient={['#6FA8E8', '#2F6DBF']}
              edge="#24508F"
              stats={[
                { label: t('home.talk.sessions'), value: history.length },
                { label: t('home.talk.average'), value: recent.length ? average.toFixed(1) : 0 },
                { label: t('home.talk.today'), value: minutes },
              ]}
              onPress={() => router.push('/scenarios')}
            />
            <VocabCard cards={cards} due={due} onPress={() => router.navigate('/words')} />

            <PathCard
              stages={stages}
              onOpenPath={() => router.push('/scenarios')}
            />

            <LeaderboardCard />
          </View>
        </Fragment>
      </ScrollView>
      <AllShortcutsSheet visible={showAll} items={shortcuts} onClose={closeAll} />
      <GamePickerSheet visible={picking} onClose={() => setPicking(false)} />
      <ReminderPrompt />
    </View>
  );
}

const createStyles = (home: Palette) => StyleSheet.create({
  // A single flat page: the header sits on the page itself and every block below is a card on it.
  root: { flex: 1, backgroundColor: home.sheet },
  content: { flexGrow: 1 },
  top: {
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  sheet: {
    flexGrow: 1,
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
});
