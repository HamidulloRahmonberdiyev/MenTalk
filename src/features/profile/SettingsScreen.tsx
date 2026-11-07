import { router, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { LANGUAGES, useT } from '@/i18n';
import { useSettingsStore } from '@/store/settingsStore';
import { colors, spacing } from '@/theme';
import { enter } from '@/theme/motion';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { AppearanceSwitch } from './AppearanceSwitch';
import { LanguageSwitcher } from './LanguageSwitcher';
import { SettingsGroup, SettingsRow } from './SettingsRow';

/** What the learner can set about the account, the tutor and the app; reminders and signing out stay on the profile. */
export function SettingsScreen() {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const languageCode = useSettingsStore((state) => state.language);
  const character = useSettingsStore((state) => state.tutorCharacter);
  const tone = useSettingsStore((state) => state.tutorTone);
  const language = LANGUAGES.find(({ code }) => code === languageCode);
  const [choosingLanguage, setChoosingLanguage] = useState(false);

  return (
    <View style={styles.root}>
      <StatusBar style={home.statusBar} />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <ScreenHeader title={t('profile.settings')} onBack={() => router.back()} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]} showsVerticalScrollIndicator={false}>
        <Section title={t('settings.section.account')} delay={0}>
          <SettingsGroup>
            <SettingsRow icon="person" tint={colors.primary} label={t('profile.edit')} onPress={() => router.push('/profile-edit')} />
            <SettingsRow
              icon="sparkles"
              tint="#CE82FF"
              label={t('tutor.title')}
              value={`${t(`tutor.character.${character}`)} · ${t(`tutor.tone.${tone}`)}`}
              onPress={() => router.push('/settings/tutor' as Href)}
            />
          </SettingsGroup>
        </Section>

        <Section title={t('settings.section.app')} delay={60}>
          <SettingsGroup>
            <SettingsRow
              icon="globe"
              tint="#1CB0F6"
              label={t('profile.language')}
              value={language ? `${language.flag} ${language.label}` : undefined}
              onPress={() => setChoosingLanguage(true)}
            />
            {__DEV__ ? <SettingsRow icon="happy" tint="#FF9600" label="Face lab" onPress={() => router.push('/face-lab' as Href)} /> : null}
          </SettingsGroup>
          <AppearanceSwitch />
        </Section>
      </ScrollView>

      <BottomSheet visible={choosingLanguage} onClose={() => setChoosingLanguage(false)} closeLabel={t('common.cancel')}>
        <AppText variant="heading" style={styles.sheetTitle} accessibilityRole="header">
          {t('profile.language')}
        </AppText>
        <LanguageSwitcher onSelect={() => setChoosingLanguage(false)} />
      </BottomSheet>
    </View>
  );
}

function Section({ title, delay, children }: { title: string; delay: number; children: ReactNode }) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  return (
    <Animated.View entering={enter.rise(delay)} style={styles.section}>
      <AppText variant="captionStrong" color={home.textMuted} style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </Animated.View>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: home.background },
    header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, backgroundColor: home.background },
    content: { gap: spacing.xxl, paddingHorizontal: spacing.xl, paddingTop: spacing.md },
    section: { gap: spacing.md },
    sectionTitle: { paddingHorizontal: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.8 },
    sheetTitle: { textAlign: 'center' },
  });
