import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Fragment, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_SPACE } from '@/components/navigation/FloatingTabBar';
import { AppText } from '@/components/ui/AppText';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { useRefreshControl } from '@/components/ui/useRefreshControl';
import { useT } from '@/i18n';
import { authService } from '@/services/auth';
import { endSession } from '@/services/session';
import { useUserStore } from '@/store/userStore';
import { colors, spacing } from '@/theme';
import { enter } from '@/theme/motion';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { WeekCard } from '../activity/WeekCard';
import { ReminderSettingsSheet } from '../reminders/ReminderSettingsSheet';
import { formatTime, useRemindersStore } from '../reminders/remindersStore';
import { useVocabularyStore, visibleStreak } from '../vocabulary/vocabularyStore';
import { ProfileHero } from './ProfileHero';
import { SettingsGroup, SettingsRow } from './SettingsRow';
import { StatsCard } from './StatsCard';

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/** Who the learner is and how they are doing; the rest of the settings sit one tap away. */
export function ProfileScreen() {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const t = useT();
  const insets = useSafeAreaInsets();
  const { refreshControl, version } = useRefreshControl();
  const history = useUserStore((state) => state.history);
  const dailyGoalMinutes = useUserStore((state) => state.dailyGoalMinutes);
  const xp = useVocabularyStore((state) => state.xp);
  const streak = useVocabularyStore(visibleStreak);
  const remindersOn = useRemindersStore((state) => state.enabled);
  const reminderTime = useRemindersStore((state) => state.time);

  const [editingReminders, setEditingReminders] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const signedOut = useRef(false);

  const totalMinutes = Math.round(sum(history.map((entry) => entry.durationSec)) / 60);
  const average = history.length ? (sum(history.map((entry) => entry.score)) / history.length).toFixed(1) : '–';

  /** Signs out while the sheet shows progress; the session ends once the sheet has slid away. */
  const logout = async () => {
    setSigningOut(true);
    await authService.signOut().catch(() => undefined);
    signedOut.current = true;
    setConfirmingLogout(false);
  };

  const logoutClosed = () => {
    if (!signedOut.current) return;
    endSession();
    router.replace('/');
  };

  return (
    <View style={styles.root}>
      <StatusBar style={home.statusBar} />
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <AppText variant="title" color={home.text} accessibilityRole="header">
          {t('profile.title')}
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_SPACE + insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        <Fragment key={version}>
          <ProfileHero />

          <Animated.View entering={enter.rise(60)} style={styles.section}>
            <AppText variant="heading" color={home.text} style={styles.sectionTitle} accessibilityRole="header">
              {t('profile.progress')}
            </AppText>
            <WeekCard />
            <StatsCard
              stats={[
                { icon: 'flame', tint: '#FF9600', value: `${streak}`, label: t('practice.stat.streak') },
                { icon: 'flash', tint: '#FFC800', value: `${xp}`, label: 'XP' },
                { icon: 'flag', tint: '#FF4B4B', value: t('common.minutes', { n: dailyGoalMinutes }), label: t('profile.field.daily') },
                { icon: 'chatbubbles', tint: colors.primary, value: `${history.length}`, label: t('profile.statTalks') },
                { icon: 'time', tint: '#58CC02', value: `${totalMinutes}`, label: t('profile.statMinutes') },
                { icon: 'star', tint: '#CE82FF', value: average, label: t('profile.statRating') },
              ]}
            />
            <SettingsGroup>
              <SettingsRow icon="ribbon" tint="#C9A85C" label={t('certificate.title')} onPress={() => router.push('/certificate')} />
              <SettingsRow icon="settings" tint={colors.primary} label={t('profile.settings')} onPress={() => router.push('/settings' as Href)} />
              <SettingsRow
                icon="notifications"
                tint="#FF9600"
                label={t('reminders.settings.title')}
                value={remindersOn ? formatTime(reminderTime) : t('reminders.settings.off')}
                onPress={() => setEditingReminders(true)}
              />
            </SettingsGroup>
          </Animated.View>

          <Animated.View entering={enter.rise(120)} style={styles.section}>
            <SettingsRow icon="log-out" tint={colors.danger} label={t('profile.logout')} destructive onPress={() => setConfirmingLogout(true)} />
            <AppText variant="caption" color={home.textMuted} style={styles.version}>
              {`MenTalk · v${Constants.expoConfig?.version ?? '1.0.0'}`}
            </AppText>
          </Animated.View>
        </Fragment>
      </ScrollView>

      <ReminderSettingsSheet visible={editingReminders} onClose={() => setEditingReminders(false)} />

      <ConfirmSheet
        visible={confirmingLogout}
        icon="log-out-outline"
        title={t('profile.logoutTitle')}
        message={t('profile.logoutMessage')}
        confirmLabel={t('profile.logout')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={signingOut}
        onConfirm={logout}
        onCancel={() => setConfirmingLogout(false)}
        onClosed={logoutClosed}
      />
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
    content: { gap: spacing.xxl, padding: spacing.xl },
    section: { gap: spacing.md },
    sectionTitle: { fontWeight: '800', paddingHorizontal: spacing.xs },
    version: { textAlign: 'center', marginTop: spacing.sm },
  });
