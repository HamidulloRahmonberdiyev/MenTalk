import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import type { IconName } from '@/types';

interface IconTileProps {
  icon: IconName;
  tint: string;
  size?: number;
  /** Solid gradient tile with a white icon instead of a pastel tile. */
  gradient?: readonly [string, string];
}

export function IconTile({ icon, tint, size = 46, gradient }: IconTileProps) {
  const box = { width: size, height: size, borderRadius: size * 0.3 };
  const iconSize = size * 0.5;

  if (gradient) {
    return (
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[box, { alignItems: 'center', justifyContent: 'center' }]}
      >
        <Ionicons name={icon} size={iconSize} color="#FFFFFF" />
      </LinearGradient>
    );
  }

  return (
    <View style={[box, { backgroundColor: `${tint}22`, alignItems: 'center', justifyContent: 'center' }]}>
      <Ionicons name={icon} size={iconSize} color={tint} />
    </View>
  );
}
