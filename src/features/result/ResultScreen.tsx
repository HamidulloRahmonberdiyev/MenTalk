import { Redirect, router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { isApiConfigured } from '@/services/api/config';
import { haptics } from '@/services/haptics';
import { useResultStore } from '@/store/resultStore';
import { useT } from '@/i18n';
import { useScenario } from '@/store/scenariosStore';
import { useSettingsStore } from '@/store/settingsStore';
import { radii, spacing } from '@/theme';
import { enter } from '@/theme/motion';

import { starsFor } from '../path/path';
import { NewWordsCard } from '../vocabulary/NewWordsCard';
import { MetricRow } from './MetricRow';
import { MistakeCard } from './MistakeCard';
import { ResultHero } from './ResultHero';
import { formatDuration, getVerdict } from './resultCopy';
import { StatTile } from './StatTile';

/** Score, time and words: amber, sky and lime frames, with a deeper ink for the value inside. */
const TILES = {
  score: { color: '#FFB020', ink: '#E08A00' },
  time: { color: '#1CB0F6', ink: '#1690CC' },
  words: { color: '#58CC02', ink: '#4CA302' },
} as const;

export function ResultScreen() {
  const t = useT();
  const language = useSettingsStore((state) => state.language);
  const result = useResultStore((state) => state.result);
  const scenario = useScenario(result?.scenarioId);
  const stars = result ? starsFor(result.overall) : 0;

  // A little buzz as the cup lands, when there is something to celebrate.
  useEffect(() => {
    if (stars === 0) return;
    const timer = setTimeout(() => haptics.success(), 380);
    return () => clearTimeout(timer);
  }, [stars]);

  if (!result) return <Redirect href="/home" />;

  const verdict = getVerdict(result.overall);
  const words = result.newWords?.length ?? 0;

  const goHome = () => {
    router.replace('/home');
  };

  const retry = () => {
    router.replace({ pathname: '/conversation/[scenarioId]', params: { scenarioId: result.scenarioId } });
  };

  return (
    <Screen>
      <ScreenHeader title={t('result.title')} onBack={goHome} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ResultHero
          stars={stars}
          title={t(verdict.title)}
          subtitle={t(verdict.subtitle)}
          topic={scenario?.title[language] ?? t('conversations.pastTopic')}
        />

        <View style={styles.tiles}>
          <StatTile label={t('result.stat.score')} icon="star" value={`${result.overall}/10`} {...TILES.score} delay={260} />
          <StatTile label={t('result.stat.time')} icon="time" value={formatDuration(result.durationSec)} {...TILES.time} delay={330} />
          <StatTile label={t('result.stat.words')} icon="book" value={String(words)} {...TILES.words} delay={400} />
        </View>

        {result.metrics.length > 0 ? (
          <Animated.View entering={enter.rise(470)}>
            <Card style={styles.metrics}>
              <AppText variant="heading" accessibilityRole="header">
                {t('result.skills')}
              </AppText>
              {result.metrics.map((metric, index) => (
                <MetricRow key={metric.id} metric={metric} delay={650 + index * 140} />
              ))}
            </Card>
          </Animated.View>
        ) : null}

        {words > 0 && result.newWords ? <NewWordsCard words={result.newWords} /> : null}

        {result.mistakes.length > 0 ? (
          <View style={styles.mistakes}>
            <View style={styles.sectionHead}>
              <AppText variant="heading" accessibilityRole="header" style={styles.flex}>
                {t('result.mistakes')}
              </AppText>
              <View style={styles.count}>
                <AppText color="#FFFFFF" style={styles.countText}>
                  {result.mistakes.length}
                </AppText>
              </View>
            </View>
            {result.mistakes.map((mistake) => (
              <MistakeCard key={mistake.id} mistake={mistake} />
            ))}
            {/* Every correction of the chat is already in the notebook, ready to practise. */}
            {isApiConfigured ? (
              <Button title={t('mistakes.fromResult')} icon="flash" variant="soft" onPress={() => router.push('/mistakes-practice')} />
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button title={t('result.retry')} icon="refresh" onPress={retry} />
        <Button title={t('result.home')} icon="home" variant="soft" onPress={goHome} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.lg },
  flex: { flex: 1 },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  metrics: { gap: spacing.lg, padding: spacing.lg },
  mistakes: { gap: spacing.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  count: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4B4B',
  },
  countText: { fontSize: 14, lineHeight: 18, fontWeight: '900' },
  footer: { gap: spacing.md, paddingTop: spacing.md },
});
