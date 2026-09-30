import { Redirect, router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useResultStore } from '@/store/resultStore';
import { useT } from '@/i18n';
import { colors, spacing } from '@/theme';

import { MetricRow } from './MetricRow';
import { MistakeCard } from './MistakeCard';
import { getVerdict } from './resultCopy';
import { TrophyHero } from './TrophyHero';

export function ResultScreen() {
  const t = useT();
  const result = useResultStore((state) => state.result);

  if (!result) return <Redirect href="/home" />;

  const verdict = getVerdict(result.overall);

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
        <View style={styles.hero}>
          <TrophyHero />
          <AppText variant="title" accessibilityRole="header">
            {t(verdict.title)}
          </AppText>
          <AppText color={colors.textSecondary} style={styles.center}>
            {t(verdict.subtitle)}
          </AppText>
          <AppText variant="captionStrong" color={colors.primary}>
            {t(`scenario.${result.scenarioId}.title`)} · {result.overall}/10
          </AppText>
        </View>

        <Card style={styles.metrics}>
          {result.metrics.map((metric) => (
            <MetricRow key={metric.id} metric={metric} />
          ))}
        </Card>

        {result.mistakes.length > 0 ? (
          <View style={styles.mistakes}>
            <AppText variant="heading" accessibilityRole="header">
              {t('result.mistakes')}
            </AppText>
            {result.mistakes.map((mistake) => (
              <MistakeCard key={mistake.id} mistake={mistake} />
            ))}
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
  content: {
    paddingVertical: spacing.lg,
    gap: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  center: {
    textAlign: 'center',
  },
  metrics: {
    gap: spacing.lg,
    padding: spacing.xl,
  },
  mistakes: {
    gap: spacing.md,
  },
  footer: {
    gap: spacing.md,
    paddingTop: spacing.md,
  },
});
