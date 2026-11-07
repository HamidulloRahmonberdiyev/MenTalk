import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useT } from '@/i18n';
import { spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { TutorCard } from './TutorCard';

/** Who the learner talks to and in which tone, with the live preview: a page of its own in settings. */
export function TutorSettingsScreen() {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <StatusBar style={home.statusBar} />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <ScreenHeader title={t('tutor.title')} onBack={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]} showsVerticalScrollIndicator={false}>
        <TutorCard />
      </ScrollView>
    </View>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: home.background },
    header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, backgroundColor: home.background },
    content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  });
