import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Pressable3D } from '@/components/ui/Pressable3D';
import { haptics } from '@/services/haptics';
import { spacing } from '@/theme';
import type { IconName } from '@/types';

export interface Resource {
  key: string;
  title: string;
  /** Small line under the title, e.g. how many words are waiting. */
  hint?: string;
  icon: IconName;
  gradient: readonly [string, string];
  edge: string;
  onPress: () => void;
}

const RADIUS = 30;

export function ResourceCard({ title, hint, icon, gradient, edge, onPress }: Omit<Resource, 'key'>) {
  return (
    <Pressable3D
      accessibilityRole="button"
      accessibilityLabel={hint ? `${title}. ${hint}` : title}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      edgeColor={edge}
      depth={6}
      radius={RADIUS}
    >
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.face}>
        <View style={styles.art} pointerEvents="none">
          <Ionicons name={icon} size={132} color="rgba(20, 10, 60, 0.2)" style={styles.artShadow} />
          <Ionicons name={icon} size={132} color="rgba(255, 255, 255, 0.55)" />
        </View>
        <AppText color="#FFFFFF" numberOfLines={1} adjustsFontSizeToFit style={styles.title}>
          {title}
        </AppText>
        {hint ? (
          <AppText variant="captionStrong" color="rgba(255, 255, 255, 0.9)" numberOfLines={1} style={styles.hint}>
            {hint}
          </AppText>
        ) : null}
      </LinearGradient>
    </Pressable3D>
  );
}

const styles = StyleSheet.create({
  face: {
    minHeight: 124,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  art: {
    position: 'absolute',
    right: 4,
    bottom: -22,
    transform: [{ rotate: '-8deg' }],
  },
  artShadow: {
    position: 'absolute',
    transform: [{ translateX: 7 }, { translateY: 7 }],
  },
  title: {
    marginRight: 120,
    fontSize: 38,
    lineHeight: 46,
    fontWeight: '900',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.12)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  hint: {
    marginRight: 120,
  },
});
