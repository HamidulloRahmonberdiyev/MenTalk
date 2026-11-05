import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { ScenarioThumb } from '@/components/ui/ScenarioThumb';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { useSettingsStore } from '@/store/settingsStore';
import { radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import type { PathStage } from '../path/path';
import { usePath } from '../path/usePath';
import { openConversation } from '../scenarios/navigation';

/** The topics on offer in the studied language. A locked one leads to the path, which says what opens it. */
export function TopicStrip() {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const language = useSettingsStore((state) => state.language);
  const stages = usePath();

  const open = ({ scenario, status }: PathStage) => {
    haptics.selection();
    if (status === 'locked') router.push('/scenarios');
    else openConversation(scenario.id);
  };

  if (!stages.length) return null;

  return (
    <View style={styles.root}>
      <AppText variant="heading" color={home.text} accessibilityRole="header" style={styles.heading}>
        {t('home.menu.topics')}
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
        {stages.map((stage) => (
          <Pressable
            key={stage.scenario.id}
            accessibilityRole="button"
            accessibilityLabel={stage.scenario.title[language]}
            onPress={() => open(stage)}
            style={styles.card}
          >
            <View style={styles.top}>
              <ScenarioThumb scenario={stage.scenario} size={52} />
              {stage.status === 'locked' ? <Ionicons name="lock-closed" size={16} color={home.textMuted} /> : null}
            </View>
            <AppText variant="bodyStrong" color={home.text} numberOfLines={1}>
              {stage.scenario.title[language]}
            </AppText>
            <AppText variant="caption" color={home.textMuted} numberOfLines={2}>
              {stage.scenario.subtitle[language]}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    // Runs to the screen edges, past the padding of the list it sits in.
    root: { gap: spacing.sm, marginHorizontal: -spacing.xl },
    heading: { paddingHorizontal: spacing.xl },
    list: { gap: spacing.md, paddingHorizontal: spacing.xl },
    card: {
      width: 156,
      gap: spacing.xs,
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderBottomWidth: 5,
      borderColor: home.rim,
      borderBottomColor: home.rimBottom,
      backgroundColor: home.panel,
    },
    top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.xs },
  });
