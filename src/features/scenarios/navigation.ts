import { router } from 'expo-router';

import type { ScenarioId } from '@/types';

export function openConversation(scenarioId: ScenarioId): void {
  router.push({ pathname: '/conversation/[scenarioId]', params: { scenarioId } });
}
