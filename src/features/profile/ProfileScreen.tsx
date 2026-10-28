import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { TabScreen } from '@/components/ui/TabScreen';
import { LANGUAGES, useT } from '@/i18n';
import { authService } from '@/services/auth';
import { endSession } from '@/services/session';
import { useSettingsStore } from '@/store/settingsStore';
import { useUserStore } from '@/store/userStore';
import { colors, spacing } from '@/theme';
import { enter } from '@/theme/motion';

import { LanguageSwitcher } from './LanguageSwitcher';
import { ProfileHero } from './ProfileHero';
import { SettingsGroup, SettingsRow } from './SettingsRow';
import { StatsCard } from './StatsCard';

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export function ProfileScreen() {
  const t = useT();
  const history = useUserStore((state) => state.history);
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
    <TabScreen>
      <ProfileHero />

      <Animated.View entering={enter.rise(60)} style={styles.section}>
        <SectionTitle>{t('profile.progress')}</SectionTitle>
        <StatsCard
          stats={[
            { icon: 'chatbubbles', tint: colors.primary, value: `${history.length}`, label: t('profile.statTalks') },
            { icon: 'time', tint: colors.success, value: `${totalMinutes}`, label: t('profile.statMinutes') },
            { icon: 'star', tint: colors.warning, value: average, label: t('profile.statRating') },
          ]}
        />
      </Animated.View>

      <Animated.View entering={enter.rise(120)} style={styles.section}>
        <SectionTitle>{t('profile.settings')}</SectionTitle>
        <SettingsGroup>
          <SettingsRow key="edit" icon="person" tint={colors.primary} label={t('profile.edit')} onPress={() => router.push('/profile-edit')} />
          <SettingsRow
            key="language"
            icon="globe"
            tint={colors.purple}
            label={t('profile.language')}
            value={language ? `${language.flag} ${language.label}` : undefined}
            onPress={() => setChoosingLanguage(true)}
          />
          {__DEV__ ? (
            <SettingsRow key="face" icon="happy" tint={colors.warning} label="Face lab" onPress={() => router.push('/face-lab' as Href)} />
          ) : null}
        </SettingsGroup>
      </Animated.View>

      <Animated.View entering={enter.rise(180)} style={styles.section}>
        <SettingsGroup>
          <SettingsRow icon="log-out" tint={colors.danger} label={t('profile.logout')} destructive onPress={() => setConfirmingLogout(true)} />
        </SettingsGroup>
        <AppText variant="caption" color={colors.textMuted} style={styles.version}>
          {`MenTalk · v${Constants.expoConfig?.version ?? '1.0.0'}`}
        </AppText>
      </Animated.View>

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
    </TabScreen>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <AppText variant="captionStrong" color={colors.textSecondary} style={styles.sectionTitle} accessibilityRole="header">
      {children}
    </AppText>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  sectionTitle: { textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: spacing.xs },
  version: { textAlign: 'center', marginTop: spacing.md },
  sheetTitle: { textAlign: 'center' },
});
