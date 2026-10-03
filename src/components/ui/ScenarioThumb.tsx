import { Image } from 'expo-image';
import { View } from 'react-native';

import type { Scenario } from '@/types';

interface ScenarioThumbProps {
  scenario: Scenario;
  size?: number;
}

/** Rounded photo of a scenario, used where a small icon tile used to be. */
export function ScenarioThumb({ scenario, size = 48 }: ScenarioThumbProps) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, overflow: 'hidden', backgroundColor: scenario.tint }}>
      <Image source={scenario.image} contentFit="cover" transition={150} style={{ width: size, height: size }} />
    </View>
  );
}
