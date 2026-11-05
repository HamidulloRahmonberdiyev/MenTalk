import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { ConversationScreen } from '@/features/conversation/ConversationScreen';
import { scenarioById } from '@/store/scenariosStore';

export default function ConversationRoute() {
  const { scenarioId } = useLocalSearchParams<{ scenarioId: string }>();
  // Read once: new topics arriving in the background must not restart a conversation under way.
  const [scenario] = useState(() => scenarioById(scenarioId));
  if (!scenario) return <Redirect href="/scenarios" />;
  return <ConversationScreen scenario={scenario} />;
}
