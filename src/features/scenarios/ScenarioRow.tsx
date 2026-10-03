import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { ScenarioThumb } from '@/components/ui/ScenarioThumb';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { colors, radii, shadows, spacing } from '@/theme';
import type { Scenario } from '@/types';

interface ScenarioRowProps {
  scenario: Scenario;
  onPress: (scenario: Scenario) => void;
  /** `large` renders a photo card; `compact` a list row with a photo thumbnail. */
  size?: 'compact' | 'large';
  selected?: boolean;
}

export function ScenarioRow({ scenario, onPress, size = 'compact', selected = false }: ScenarioRowProps) {
  const t = useT();
  const title = t(`scenario.${scenario.id}.title`);
  const subtitle = t(`scenario.${scenario.id}.subtitle`);
  const handlePress = () => {
    haptics.selection();
    onPress(scenario);
  };

  if (size === 'large') {
    return (
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${subtitle}`}
        accessibilityState={{ selected }}
        onPress={handlePress}
        scaleTo={0.98}
        style={[styles.card, selected && styles.cardSelected]}
      >
        <Image source={scenario.image} contentFit="cover" transition={200} style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={['rgba(8,24,40,0)', 'rgba(8,24,40,0.25)', 'rgba(8,24,40,0.82)']}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.badge}>
          <Ionicons name={scenario.icon} size={20} color={colors.onPrimary} />
        </View>
        <View style={[styles.mark, selected && styles.markOn]}>
          {selected ? <Ionicons name="checkmark" size={18} color={colors.onPrimary} /> : null}
        </View>

        <View style={styles.caption}>
          <AppText variant="heading" color="#FFFFFF" numberOfLines={1}>
            {title}
          </AppText>
          <AppText variant="caption" color="rgba(255,255,255,0.85)" numberOfLines={1}>
            {subtitle}
          </AppText>
        </View>
      </PressableScale>
    );
  }

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={handlePress}
      style={styles.row}
    >
      <ScenarioThumb scenario={scenario} size={56} />
      <View style={styles.texts}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary} numberOfLines={2}>
          {subtitle}
        </AppText>
      </View>
      <View style={styles.chevron}>
        <Ionicons name="chevron-forward" size={16} color={colors.primary} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 168,
    borderRadius: radii.xl,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    borderWidth: 3,
    borderColor: 'transparent',
    backgroundColor: colors.primarySoft,
    ...shadows.raised,
  },
  cardSelected: { borderColor: colors.primary },
  badge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,24,40,0.38)',
  },
  mark: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(8,24,40,0.25)',
  },
  markOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  caption: { padding: spacing.lg, gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  texts: { flex: 1, gap: 2 },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
});
