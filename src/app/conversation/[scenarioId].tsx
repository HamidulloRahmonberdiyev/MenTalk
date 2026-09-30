import { Redirect, useLocalSearchParams } from 'expo-router';

import { ConversationScreen } from '@/features/conversation/ConversationScreen';
import { SCENARIO_MAP, isScenarioId } from '@/mocks/scenarios';

export default function ConversationRoute() {
  const { scenarioId } = useLocalSearchParams<{ scenarioId: string }>();
  if (!isScenarioId(scenarioId)) return <Redirect href="/scenarios" />;
  return <ConversationScreen scenario={SCENARIO_MAP[scenarioId]} />;
}
