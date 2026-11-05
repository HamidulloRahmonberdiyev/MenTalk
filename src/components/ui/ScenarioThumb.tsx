import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { View } from 'react-native';

import { colors } from '@/theme';
import type { Scenario } from '@/types';

interface ScenarioThumbProps {
  /** Left out for a topic the server no longer offers. */
  scenario?: Scenario;
  size?: number;
}

/** Rounded photo of a scenario, or its icon when it has no photo. */
export function ScenarioThumb({ scenario, size = 48 }: ScenarioThumbProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: scenario?.tint ?? colors.primary,
      }}
    >
      {scenario?.image ? (
        <Image source={scenario.image} contentFit="cover" transition={150} style={{ width: size, height: size }} />
      ) : (
        <Ionicons name={scenario?.icon ?? 'chatbubbles'} size={size * 0.5} color="#FFFFFF" />
      )}
    </View>
  );
}
