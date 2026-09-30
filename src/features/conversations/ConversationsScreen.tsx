import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TabScreen } from '@/components/ui/TabScreen';
import { useT } from '@/i18n';
import { useUserStore } from '@/store/userStore';
import { colors, radii, spacing } from '@/theme';

import { HistoryRow } from './HistoryRow';

export function ConversationsScreen() {
  const t = useT();
  const history = useUserStore((state) => state.history);

  return (
    <TabScreen>
      <AppText variant="title" accessibilityRole="header">
        {t('conversations.title')}
      </AppText>

      {history.length ? (
        <View style={styles.list}>
          {history.map((entry) => (
            <HistoryRow key={entry.id} entry={entry} />
          ))}
        </View>
      ) : (
        <View style={styles.empty}>
          <View style={styles.badge}>
            <Ionicons name="chatbubbles" size={34} color={colors.primary} />
          </View>
          <AppText variant="heading">{t('conversations.emptyTitle')}</AppText>
          <AppText color={colors.textSecondary} style={styles.text}>
            {t('conversations.emptyText')}
          </AppText>
          <Button
            title={t('home.start')}
            icon="mic"
            onPress={() => router.push('/scenarios')}
            style={styles.button}
          />
        </View>
      )}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xxl,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    boxShadow: '0 4px 18px rgba(23, 64, 128, 0.07)',
  },
  badge: {
    width: 76,
    height: 76,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    marginBottom: spacing.sm,
  },
  text: { textAlign: 'center', marginBottom: spacing.md },
  button: { alignSelf: 'stretch' },
});
