import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { TabScreen } from '@/components/ui/TabScreen';
import { useT } from '@/i18n';
import { SCENARIOS, SCENARIO_MAP } from '@/mocks/scenarios';
import { useUserStore } from '@/store/userStore';
import { colors, spacing } from '@/theme';

import { WordsPromoCard } from '../vocabulary/WordsPromoCard';
import { openConversation } from '../scenarios/navigation';
import { ScenarioRow } from '../scenarios/ScenarioRow';
import { ContinueCard } from './ContinueCard';
import { DailyGoalCard } from './DailyGoalCard';
import { HomeHeader } from './HomeHeader';
import { Section } from './Section';

const PREVIEW_COUNT = 4;

export function HomeScreen() {
  const t = useT();
  const name = useUserStore((state) => state.name);
  const goalMinutes = useUserStore((state) => state.dailyGoalMinutes);
  const minutesToday = useUserStore((state) => state.minutesToday);
  const lastScenarioId = useUserStore((state) => state.lastScenarioId);
  const lastScenario = lastScenarioId ? SCENARIO_MAP[lastScenarioId] : null;

  return (
    <TabScreen>
      <HomeHeader name={name} />
      <DailyGoalCard minutesDone={minutesToday} goalMinutes={goalMinutes} />
      <Button title={t('home.start')} icon="mic" onPress={() => router.push('/scenarios')} />
      <WordsPromoCard />

      {lastScenario ? (
        <Section title={t('home.continue')}>
          <ContinueCard scenario={lastScenario} onPress={() => openConversation(lastScenario.id)} />
        </Section>
      ) : null}

      <Section
        title={t('home.chooseTopic')}
        action={
          <PressableScale hitSlop={10} onPress={() => router.push('/scenarios')} accessibilityRole="button">
            <AppText variant="bodyStrong" color={colors.primary}>
              {t('home.all')}
            </AppText>
          </PressableScale>
        }
      >
        <View style={styles.list}>
          {SCENARIOS.slice(0, PREVIEW_COUNT).map((scenario) => (
            <ScenarioRow key={scenario.id} scenario={scenario} onPress={(item) => openConversation(item.id)} />
          ))}
        </View>
      </Section>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
});
