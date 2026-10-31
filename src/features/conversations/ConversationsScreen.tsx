import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Fragment } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_SPACE } from '@/components/navigation/FloatingTabBar';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useRefreshControl } from '@/components/ui/useRefreshControl';
import { useT } from '@/i18n';
import { useUserStore } from '@/store/userStore';
import { colors, radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { HistoryRow } from './HistoryRow';

export function ConversationsScreen() {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { refreshControl, version } = useRefreshControl();
  const history = useUserStore((state) => state.history);

  return (
    <View style={styles.root}>
      <StatusBar style={home.statusBar} />
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <AppText variant="title" color={home.text} accessibilityRole="header">
          {t('conversations.title')}
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_SPACE + insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        <Fragment key={version}>
          {history.length ? (
            history.map((entry) => <HistoryRow key={entry.id} entry={entry} />)
          ) : (
            <View style={styles.empty}>
              <View style={styles.badge}>
                <Ionicons name="chatbubbles" size={34} color={colors.onPrimary} />
              </View>
              <AppText variant="heading" color={home.text} style={styles.center}>
                {t('conversations.emptyTitle')}
              </AppText>
              <AppText color={home.textMuted} style={[styles.center, styles.text]}>
                {t('conversations.emptyText')}
              </AppText>
              <Button title={t('home.start')} icon="mic" onPress={() => router.push('/scenarios')} style={styles.button} />
            </View>
          )}
        </Fragment>
      </ScrollView>
    </View>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: home.background },
    // Same bar as the other tabs.
    header: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.lg,
      backgroundColor: home.header,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: home.divider,
    },
    content: { gap: spacing.md, padding: spacing.xl },
    empty: {
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.xxl,
      borderRadius: radii.xl,
      borderWidth: 2,
      borderBottomWidth: 6,
      borderColor: home.rim,
      borderBottomColor: home.rimBottom,
      backgroundColor: home.panel,
    },
    badge: {
      width: 76,
      height: 76,
      marginBottom: spacing.sm,
      borderRadius: radii.xl,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderBottomWidth: 5,
      borderBottomColor: '#1A84BF',
    },
    center: { textAlign: 'center' },
    text: { marginBottom: spacing.md },
    button: { alignSelf: 'stretch' },
  });
