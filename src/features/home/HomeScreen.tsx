import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Fragment, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_SPACE } from '@/components/navigation/FloatingTabBar';
import { useRefreshControl } from '@/components/ui/useRefreshControl';
import { useT } from '@/i18n';
import { isApiConfigured } from '@/services/api/config';
import { useUserStore } from '@/store/userStore';
import { radii, spacing } from '@/theme';
import { useThemedStyles, type Palette } from '@/theme/appearance';

import { ReminderPrompt } from '../reminders/ReminderPrompt';
import { useReminderRoute } from '../reminders/useReminderRoute';
import { usePath } from '../path/usePath';
import { openConversation } from '../scenarios/navigation';
import { GamePickerSheet } from '../vocabulary/GamePickerSheet';
import { countDue, useStudyCards, useVocabularyStore, visibleStreak } from '../vocabulary/vocabularyStore';
import { FeatureCard } from './FeatureCard';
import { GoalPanel, type HeroStat } from './GoalPanel';
import { HERO } from './heroColors';
import { HomeHeader } from './HomeHeader';
import { ShortcutGrid, type Shortcut } from './ShortcutGrid';
import { PathCard } from './PathCard';
import { VocabCard } from './VocabCard';
import { WeekStrip } from './WeekStrip';

/** Average of the latest conversation scores (out of 10). */
const RECENT_SCORES = 10;

export function HomeScreen() {
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
  const minutes = Math.floor(minutesToday);

  const stats: HeroStat[] = [
    { key: 'score', icon: 'star', label: t('home.stats.score'), value: recent.length ? average.toFixed(1) : '–' },
    { key: 'words', icon: 'book', label: t('home.stats.words'), value: String(cards.length) },
    { key: 'streak', icon: 'flame', label: t('home.stats.streak'), value: String(streak) },
    { key: 'topics', icon: 'compass', label: t('home.stats.topics'), value: `${passedStages}/${stages.length}` },
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
        onPress: () => {
          const next = openStage?.scenario.id ?? lastScenarioId ?? stages[0]?.scenario.id;
          if (next) openConversation(next);
        },
      },
      // The mistakes notebook lives on the server, so without one the slot stays a random topic.
      isApiConfigured
        ? { key: 'mistakes', label: t('home.menu.mistakes'), art: 'mistakes', onPress: () => router.push('/mistakes') }
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
      { key: 'pronunciation', label: t('pron.menu'), art: 'mic', onPress: () => router.push('/pronunciation') },
    ],
    [t, lastScenarioId, openStage, stages, unlocked],
  );

  return (
    <View style={styles.root}>
      {/* The hero is navy in both themes, so the status bar is light here and flips back on other screens. */}
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        <Fragment key={version}>
          <LinearGradient colors={HERO.gradient} style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
            {/* Quiet light shapes for depth behind the hero. */}
            <View pointerEvents="none" style={[styles.orb, styles.orbA]} />
            <View pointerEvents="none" style={[styles.orb, styles.orbB]} />
            <HomeHeader name={name} />
            <WeekStrip />
            <GoalPanel minutes={minutes} goalMinutes={goalMinutes} stats={stats} />
          </LinearGradient>

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
            <VocabCard cards={cards} due={due} onPress={() => router.navigate('/words')} />

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
  root: { flex: 1, backgroundColor: HERO.deep },
  content: { flexGrow: 1 },
  top: {
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    // Runs on under the sheet's rounded corners.
    paddingBottom: spacing.lg + 28,
    marginBottom: -28,
    overflow: 'hidden',
  },
  orb: { position: 'absolute', borderRadius: 999 },
  orbA: { width: 260, height: 260, top: -90, right: -110, backgroundColor: 'rgba(42,171,238,0.16)' },
  orbB: { width: 180, height: 180, top: 210, left: -100, backgroundColor: 'rgba(42,171,238,0.08)' },
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
