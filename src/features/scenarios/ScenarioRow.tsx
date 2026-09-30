import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { colors, radii, shadows, spacing } from '@/theme';
import type { Scenario } from '@/types';

interface ScenarioRowProps {
  scenario: Scenario;
  onPress: (scenario: Scenario) => void;
  size?: 'compact' | 'large';
  selected?: boolean;
}

export function ScenarioRow({ scenario, onPress, size = 'compact', selected = false }: ScenarioRowProps) {
  const t = useT();
  const isLarge = size === 'large';
  const title = t(`scenario.${scenario.id}.title`);
  const subtitle = t(`scenario.${scenario.id}.subtitle`);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      accessibilityState={{ selected }}
      onPress={() => {
        haptics.selection();
        onPress(scenario);
      }}
      style={[styles.row, isLarge && styles.rowLarge, selected && styles.selected]}
    >
      <IconTile icon={scenario.icon} tint={scenario.tint} size={isLarge ? 64 : 48} gradient={scenario.gradient} />
      <View style={styles.texts}>
        <AppText variant={isLarge ? 'subheading' : 'bodyStrong'} numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary} numberOfLines={2}>
          {subtitle}
        </AppText>
      </View>
      {selected ? (
        <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
      ) : (
        <View style={styles.chevron}>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...shadows.card,
  },
  rowLarge: {
    borderRadius: radii.xl,
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
});
