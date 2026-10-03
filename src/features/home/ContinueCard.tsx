import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { ScenarioThumb } from '@/components/ui/ScenarioThumb';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { colors, radii, shadows, spacing } from '@/theme';
import type { Scenario } from '@/types';

interface ContinueCardProps {
  scenario: Scenario;
  onPress: () => void;
}

export function ContinueCard({ scenario, onPress }: ContinueCardProps) {
  const t = useT();
  const title = t(`scenario.${scenario.id}.title`);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${t('home.continue')}: ${title}`}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={styles.card}
    >
      <ScenarioThumb scenario={scenario} size={76} />
      <View style={styles.texts}>
        <AppText variant="subheading">{title}</AppText>
        <AppText variant="caption" color={colors.textSecondary} numberOfLines={2}>
          {t(`scenario.${scenario.id}.subtitle`)}
        </AppText>
      </View>
      <View style={styles.play}>
        <Ionicons name="play" size={16} color={colors.onPrimary} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  play: {
    width: 36,
    height: 36,
    paddingLeft: 2,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    ...shadows.primary,
  },
});
