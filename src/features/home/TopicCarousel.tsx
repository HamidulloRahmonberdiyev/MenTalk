import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { radii, spacing } from '@/theme';
import type { Scenario } from '@/types';

interface TopicCarouselProps {
  scenarios: readonly Scenario[];
  onPress: (scenario: Scenario) => void;
}

export function TopicCarousel({ scenarios, onPress }: TopicCarouselProps) {
  const t = useT();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.scroll}>
      {scenarios.map((scenario) => {
        const title = t(`scenario.${scenario.id}.title`);
        return (
          <PressableScale
            key={scenario.id}
            accessibilityRole="button"
            accessibilityLabel={title}
            onPress={() => {
              haptics.selection();
              onPress(scenario);
            }}
            style={styles.card}
          >
            <Image source={scenario.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
            <LinearGradient colors={['transparent', 'rgba(0, 0, 0, 0.75)']} style={StyleSheet.absoluteFill} />
            <AppText variant="bodyStrong" color="#FFFFFF" numberOfLines={2}>
              {title}
            </AppText>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Bleeds past the sheet's side padding so cards scroll edge to edge.
  scroll: { marginHorizontal: -spacing.xl },
  row: {
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: 140,
    height: 180,
    padding: spacing.md,
    justifyContent: 'flex-end',
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
});
