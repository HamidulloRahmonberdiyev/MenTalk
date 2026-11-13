import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageSource } from 'expo-image';
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
  /** Optional 3D artwork (transparent PNG) shown tilted in the corner instead of the flat icon. */
  image?: ImageSource | number;
  /** Shorter secondary card, so two big cards never stack on top of each other. */
  compact?: boolean;
}

const RADIUS = 34;

/** Big tappable gradient card with an oversized decorative icon, as on Englify's home. */
export function FeatureCard({ title, icon, gradient, edge, stats, onPress, image, compact = false }: FeatureCardProps) {
  const artSize = compact ? 130 : 190;

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
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, compact && styles.cardCompact]}>
        {image ? (
          <View style={[styles.photo, compact && styles.photoCompact]} pointerEvents="none">
            {/* Soft light halo so the object glows out of the card rather than sitting flat on it. */}
            <View style={styles.photoGlow} />
            <View style={styles.photoFloor} />
            <Image source={image} style={styles.photoImage} contentFit="contain" />
          </View>
        ) : (
          <View style={styles.art} pointerEvents="none">
            <Ionicons name={icon} size={artSize} color="rgba(10, 20, 60, 0.22)" style={styles.artShadow} />
            <Ionicons name={icon} size={artSize} color="rgba(255, 255, 255, 0.38)" />
          </View>
        )}

        <AppText color="#FFFFFF" numberOfLines={1} adjustsFontSizeToFit style={[styles.title, compact && styles.titleCompact]}>
          {title}
        </AppText>

        <View style={[styles.stats, compact && styles.statsCompact]}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <AppText color="#5B5A8C" numberOfLines={1} style={styles.statLabel}>
                {stat.label}
              </AppText>
              <AppText color="#2B1E5C" style={[styles.statValue, compact && styles.statValueCompact]}>
                {stat.value}
              </AppText>
            </View>
          ))}
        </View>

        <View style={[styles.arrow, compact && styles.arrowCompact]}>
          <Ionicons name="arrow-up" size={compact ? 20 : 26} color="#2B1E5C" style={styles.arrowIcon} />
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
  cardCompact: {
    minHeight: 0,
    gap: spacing.md,
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  art: {
    position: 'absolute',
    right: -18,
    bottom: -34,
    transform: [{ rotate: '-14deg' }],
  },
  photo: {
    position: 'absolute',
    right: 2,
    bottom: -14,
    width: 168,
    height: 168,
    transform: [{ rotate: '-16deg' }],
  },
  photoCompact: {
    right: -4,
    bottom: -18,
    width: 120,
    height: 120,
  },
  photoGlow: {
    position: 'absolute',
    top: '12%',
    left: '12%',
    width: '76%',
    height: '76%',
    borderRadius: radii.pill,
    backgroundColor: 'rgba(170, 215, 255, 0.35)',
    boxShadow: '0 0 40px 18px rgba(170, 215, 255, 0.45)',
  },
  photoFloor: {
    position: 'absolute',
    bottom: '4%',
    left: '22%',
    width: '56%',
    height: '10%',
    borderRadius: radii.pill,
    backgroundColor: 'rgba(10, 30, 80, 0.28)',
    boxShadow: '0 0 14px 6px rgba(10, 30, 80, 0.25)',
  },
  photoImage: {
    width: '100%',
    height: '100%',
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
  titleCompact: {
    marginRight: 52,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.5,
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
  statsCompact: {
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
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
  statValueCompact: {
    fontSize: 17,
    lineHeight: 21,
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
  arrowCompact: {
    top: spacing.md,
    right: spacing.md,
    width: 40,
    height: 40,
  },
});
