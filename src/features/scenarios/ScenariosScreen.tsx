import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useT } from '@/i18n';
import { SCENARIOS } from '@/mocks/scenarios';
import { useUserStore } from '@/store/userStore';
import { spacing } from '@/theme';
import type { ScenarioId } from '@/types';

import { openConversation } from './navigation';
import { ScenarioRow } from './ScenarioRow';

export function ScenariosScreen() {
  const t = useT();
  const lastScenarioId = useUserStore((state) => state.lastScenarioId);
  const [selectedId, setSelectedId] = useState<ScenarioId>(lastScenarioId ?? SCENARIOS[0].id);

  return (
    <Screen>
      <ScreenHeader title={t('home.chooseTopic')} onBack={() => router.back()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {SCENARIOS.map((scenario) => (
          <ScenarioRow
            key={scenario.id}
            scenario={scenario}
            size="large"
            selected={scenario.id === selectedId}
            onPress={(item) => setSelectedId(item.id)}
          />
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <Button title={t('home.start')} icon="arrow-forward" iconPosition="right" onPress={() => openConversation(selectedId)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    marginHorizontal: -spacing.xl,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  footer: {
    paddingTop: spacing.md,
  },
});
