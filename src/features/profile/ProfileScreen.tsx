import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Fragment, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_SPACE } from '@/components/navigation/FloatingTabBar';
import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { Pressable3D } from '@/components/ui/Pressable3D';
import { useRefreshControl } from '@/components/ui/useRefreshControl';
import { LANGUAGES, useT } from '@/i18n';
import { authService } from '@/services/auth';
import { haptics } from '@/services/haptics';
import { endSession } from '@/services/session';
import { useSettingsStore } from '@/store/settingsStore';
import { useUserStore } from '@/store/userStore';
import { colors, radii, spacing } from '@/theme';
import { enter } from '@/theme/motion';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { useVocabularyStore, visibleStreak } from '../vocabulary/vocabularyStore';
import { AppearanceSwitch } from './AppearanceSwitch';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ProfileHero } from './ProfileHero';
import { SettingsGroup, SettingsRow } from './SettingsRow';
import { StatsCard } from './StatsCard';

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

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
  const languageCode = useSettingsStore((state) => state.language);
  const language = LANGUAGES.find(({ code }) => code === languageCode);

  const totalMinutes = Math.round(sum(history.map((entry) => entry.durationSec)) / 60);
  const average = history.length ? (sum(history.map((entry) => entry.score)) / history.length).toFixed(1) : '–';

  const [choosingLanguage, setChoosingLanguage] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const signedOut = useRef(false);

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
        <AppText variant="title" color={home.text} accessibilityRole="header" style={styles.flex}>
          {t('profile.title')}
        </AppText>
        <Pressable3D
          accessibilityRole="button"
          accessibilityLabel={t('profile.edit')}
          hitSlop={6}
          onPress={() => {
            haptics.light();
            router.push('/profile-edit');
          }}
          edgeColor="#1A84BF"
          depth={4}
          radius={radii.md}
          faceStyle={styles.editButton}
        >
          <Ionicons name="create" size={22} color={colors.onPrimary} />
        </Pressable3D>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_SPACE + insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        <Fragment key={version}>
          <ProfileHero />

          <Animated.View entering={enter.rise(60)} style={styles.section}>
            <SectionTitle>{t('profile.progress')}</SectionTitle>
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
          </Animated.View>

          <Animated.View entering={enter.rise(120)} style={styles.section}>
            <SectionTitle>{t('profile.settings')}</SectionTitle>
            <AppearanceSwitch />
            <SettingsGroup>
              <SettingsRow icon="person" tint={colors.primary} label={t('profile.edit')} onPress={() => router.push('/profile-edit')} />
              <SettingsRow
                icon="globe"
                tint="#CE82FF"
                label={t('profile.language')}
                value={language ? `${language.flag} ${language.label}` : undefined}
                onPress={() => setChoosingLanguage(true)}
              />
              {__DEV__ ? (
                <SettingsRow icon="happy" tint="#FF9600" label="Face lab" onPress={() => router.push('/face-lab' as Href)} />
              ) : null}
            </SettingsGroup>
          </Animated.View>

          <Animated.View entering={enter.rise(180)} style={styles.section}>
            <SettingsRow icon="log-out" tint={colors.danger} label={t('profile.logout')} destructive onPress={() => setConfirmingLogout(true)} />
            <AppText variant="caption" color={home.textMuted} style={styles.version}>
              {`MenTalk · v${Constants.expoConfig?.version ?? '1.0.0'}`}
            </AppText>
          </Animated.View>
        </Fragment>
      </ScrollView>

      <BottomSheet visible={choosingLanguage} onClose={() => setChoosingLanguage(false)} closeLabel={t('common.cancel')}>
        <AppText variant="heading" style={styles.sheetTitle} accessibilityRole="header">
          {t('profile.language')}
        </AppText>
        <LanguageSwitcher onSelect={() => setChoosingLanguage(false)} />
      </BottomSheet>

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

function SectionTitle({ children }: { children: string }) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  return (
    <AppText variant="heading" color={home.text} style={styles.sectionTitle} accessibilityRole="header">
      {children}
    </AppText>
  );
}

const createStyles = (home: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: home.background },
  flex: { flex: 1 },
  // Same bar as the resources tab, so the dark tabs read as one family.
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: home.header,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: home.divider,
  },
  editButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  content: { gap: spacing.xxl, padding: spacing.xl },
  section: { gap: spacing.md },
  sectionTitle: { fontWeight: '800', paddingHorizontal: spacing.xs },
  version: { textAlign: 'center', marginTop: spacing.sm },
  sheetTitle: { textAlign: 'center' },
});
