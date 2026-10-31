import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Pressable3D } from '@/components/ui/Pressable3D';
import { haptics } from '@/services/haptics';
import { radii, spacing } from '@/theme';
import type { IconName } from '@/types';

interface FeatureStat {
  label: string;
  value: string | number;
}

interface FeatureCardProps {
  title: string;
  icon: IconName;
  /** Top-left to bottom-right fill. */
  gradient: readonly [string, string];
  /** The thick bottom edge that makes the card look raised. */
  edge: string;
  stats: FeatureStat[];
  onPress: () => void;
}

const RADIUS = 34;

/** Big tappable gradient card with an oversized decorative icon, as on Englify's home. */
export function FeatureCard({ title, icon, gradient, edge, stats, onPress }: FeatureCardProps) {
  return (
    <Pressable3D
      accessibilityRole="button"
      accessibilityLabel={[title, ...stats.map((stat) => `${stat.label} ${stat.value}`)].join(', ')}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      edgeColor={edge}
      depth={6}
      radius={RADIUS}
    >
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <View style={styles.art} pointerEvents="none">
          <Ionicons name={icon} size={190} color="rgba(10, 20, 60, 0.22)" style={styles.artShadow} />
          <Ionicons name={icon} size={190} color="rgba(255, 255, 255, 0.38)" />
        </View>

        <AppText color="#FFFFFF" numberOfLines={1} adjustsFontSizeToFit style={styles.title}>
          {title}
        </AppText>

        <View style={styles.stats}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <AppText color="#5B5A8C" numberOfLines={1} style={styles.statLabel}>
                {stat.label}
              </AppText>
              <AppText color="#2B1E5C" style={styles.statValue}>
                {stat.value}
              </AppText>
            </View>
          ))}
        </View>

        <View style={styles.arrow}>
          <Ionicons name="arrow-up" size={26} color="#2B1E5C" style={styles.arrowIcon} />
        </View>
      </LinearGradient>
    </Pressable3D>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 196,
    padding: spacing.xl,
    paddingTop: spacing.lg,
    justifyContent: 'space-between',
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  art: {
    position: 'absolute',
    right: -18,
    bottom: -34,
    transform: [{ rotate: '-14deg' }],
  },
  artShadow: {
    position: 'absolute',
    transform: [{ translateX: 8 }, { translateY: 8 }],
  },
  title: {
    marginRight: 64,
    fontSize: 46,
    lineHeight: 56,
    fontWeight: '900',
    letterSpacing: -1,
  },
  stats: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  stat: {
    gap: 2,
  },
  statLabel: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
  },
  arrow: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  arrowIcon: {
    transform: [{ rotate: '45deg' }],
  },
});
