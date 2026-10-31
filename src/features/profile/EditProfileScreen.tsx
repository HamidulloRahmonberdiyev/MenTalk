import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { Pressable3D } from '@/components/ui/Pressable3D';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { saveProfile, type ProfileEdits } from '@/services/session';
import { useSettingsStore } from '@/store/settingsStore';
import { useUserStore } from '@/store/userStore';
import { colors, radii, spacing, typography } from '@/theme';
import type { IconName, LearningGoal } from '@/types';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { parseBirthDate } from '../onboarding/birthDate';
import { BirthDateField, type BirthParts } from '../onboarding/BirthDateField';
import { CountryPicker } from '../onboarding/CountryPicker';
import { countryName, flagOf } from '../onboarding/countries';
import { DAILY, GENDERS, GOALS, LEVELS, STUDY_OPTIONS } from '../onboarding/options';
import { Chip } from './Chip';

const toParts = (iso: string | null): BirthParts => {
  const [year = '', month = '', day = ''] = iso?.split('-') ?? [];
  return { day, month, year };
};

function initialForm(): ProfileEdits {
  const { name, gender, country, birthDate, level, goals, dailyGoalMinutes } = useUserStore.getState();
  const { studyLanguage } = useSettingsStore.getState();
  return { name, gender: gender ?? 'unspecified', country, birthDate, level, goals, dailyGoalMinutes, studyLanguage };
}

export function EditProfileScreen() {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const t = useT();
  const language = useSettingsStore((state) => state.language);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [initial] = useState(initialForm);
  const [form, setForm] = useState(initial);
  const [birth, setBirth] = useState(() => toParts(initial.birthDate));
  const [pickingCountry, setPickingCountry] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  /** Leaves only once the discard sheet has slid away, so two motions never overlap. */
  const discarding = useRef(false);

  const parsedBirth = useMemo(() => parseBirthDate(birth.day, birth.month, birth.year), [birth]);
  const birthEmpty = !birth.day && !birth.month && !birth.year;
  const edits: ProfileEdits = { ...form, name: form.name.trim(), birthDate: birthEmpty ? null : (parsedBirth?.iso ?? null) };

  const valid = edits.name.length >= 2 && (birthEmpty || parsedBirth !== null);
  const dirty = JSON.stringify(edits) !== JSON.stringify(initial);

  const set = <K extends keyof ProfileEdits>(key: K, value: ProfileEdits[K]) => {
    setFailed(false);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleGoal = (goal: LearningGoal) =>
    set('goals', form.goals.includes(goal) ? form.goals.filter((item) => item !== goal) : [...form.goals, goal]);

  const leave = () => (dirty ? setConfirmingDiscard(true) : router.back());

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!dirty) return false;
      setConfirmingDiscard(true);
      return true;
    });
    return () => subscription.remove();
  }, [dirty]);

  const save = async () => {
    setSaving(true);
    setFailed(false);
    try {
      await saveProfile(edits);
      haptics.success();
      router.back();
    } catch {
      haptics.error();
      setFailed(true);
      setSaving(false);
    }
  };

  const country = form.country && form.country.length === 2 ? form.country : null;

  return (
    <View style={styles.root}>
      <StatusBar style={home.statusBar} />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable3D
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={6}
          onPress={() => {
            haptics.light();
            leave();
          }}
          edgeColor={home.rim}
          depth={4}
          radius={radii.md}
          faceStyle={styles.back}
        >
          <Ionicons name="arrow-back" size={22} color={home.text} />
        </Pressable3D>
        <AppText variant="title" color={home.text} accessibilityRole="header" numberOfLines={1} style={styles.flex}>
          {t('profile.edit')}
        </AppText>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Section icon="person" tint={colors.primary} title={t('profile.section.about')}>
            <Field label={t('profile.field.name')}>
              <TextInput
                value={form.name}
                onChangeText={(value) => set('name', value)}
                placeholder={t('onb.name.placeholder')}
                placeholderTextColor={home.textMuted}
                selectionColor={colors.primary}
                autoCapitalize="words"
                autoComplete="name"
                maxLength={120}
                returnKeyType="done"
                accessibilityLabel={t('profile.field.name')}
                style={styles.input}
              />
            </Field>

            <Field label={t('profile.field.gender')}>
              <View style={styles.wrap}>
                {GENDERS.map(({ id, emoji }) => (
                  <Chip key={id} emoji={emoji} label={t(`onb.gender.${id}`)} selected={form.gender === id} onPress={() => set('gender', id)} />
                ))}
              </View>
            </Field>

            <Field label={t('profile.field.country')}>
              <Pressable3D
                accessibilityRole="button"
                onPress={() => {
                  haptics.light();
                  setPickingCountry(true);
                }}
                edgeColor={home.rim}
                depth={4}
                radius={radii.md}
                faceStyle={styles.select}
              >
                <AppText style={styles.flag}>{country ? flagOf(country) : '🌍'}</AppText>
                <AppText variant="bodyStrong" color={country ? home.text : home.textMuted} style={styles.flex} numberOfLines={1}>
                  {country ? (countryName(country, language) ?? country) : t('profile.countryNone')}
                </AppText>
                <Ionicons name="chevron-forward" size={20} color={home.textMuted} />
              </Pressable3D>
            </Field>

            <Field label={t('profile.field.birth')}>
              <BirthDateField value={birth} onChange={setBirth} parsed={parsedBirth} autoFocus={false} themed />
            </Field>
          </Section>

          <Section icon="school" tint="#58CC02" title={t('profile.section.learning')}>
            <Field label={t('profile.field.study')}>
              <View style={styles.wrap}>
                {STUDY_OPTIONS.map(({ id, emoji }) => (
                  <Chip key={id} emoji={emoji} label={t(`study.${id}`)} selected={form.studyLanguage === id} onPress={() => set('studyLanguage', id)} />
                ))}
              </View>
            </Field>

            <Field label={t('profile.field.level')}>
              <View style={styles.wrap}>
                {LEVELS.map(({ id, emoji }) => (
                  <Chip key={id} emoji={emoji} label={t(`onb.level.${id}`)} selected={form.level === id} onPress={() => set('level', id)} />
                ))}
              </View>
            </Field>

            <Field label={t('profile.field.goals')}>
              <View style={styles.wrap}>
                {GOALS.map(({ id, emoji }) => (
                  <Chip key={id} multi emoji={emoji} label={t(`onb.goal.${id}`)} selected={form.goals.includes(id)} onPress={() => toggleGoal(id)} />
                ))}
              </View>
            </Field>

            <Field label={t('profile.field.daily')}>
              <View style={styles.wrap}>
                {DAILY.map(({ minutes, emoji }) => (
                  <Chip
                    key={minutes}
                    emoji={emoji}
                    label={t('common.minutes', { n: minutes })}
                    selected={form.dailyGoalMinutes === minutes}
                    onPress={() => set('dailyGoalMinutes', minutes)}
                  />
                ))}
              </View>
            </Field>
          </Section>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          {failed ? (
            <Animated.View entering={FadeIn.duration(200)} style={styles.error}>
              <Ionicons name="cloud-offline" size={18} color={colors.danger} />
              <AppText variant="caption" color={colors.danger} style={styles.flex}>
                {t('profile.saveFailed')}
              </AppText>
            </Animated.View>
          ) : null}
          <Button title={t('profile.save')} icon="checkmark" loading={saving} disabled={!dirty || !valid} onPress={save} />
        </View>
      </KeyboardAvoidingView>

      <BottomSheet visible={pickingCountry} onClose={() => setPickingCountry(false)} closeLabel={t('common.cancel')} style={{ height: height * 0.85 }}>
        <CountryPicker
          value={form.country}
          onChange={(id) => {
            set('country', id);
            setPickingCountry(false);
          }}
        />
      </BottomSheet>

      <ConfirmSheet
        visible={confirmingDiscard}
        icon="create-outline"
        title={t('profile.discardTitle')}
        message={t('profile.discardMessage')}
        confirmLabel={t('profile.keepEditing')}
        cancelLabel={t('profile.discard')}
        onConfirm={() => setConfirmingDiscard(false)}
        onCancel={() => {
          discarding.current = true;
          setConfirmingDiscard(false);
        }}
        onDismiss={() => setConfirmingDiscard(false)}
        onClosed={() => discarding.current && router.back()}
      />
    </View>
  );
}

interface SectionProps {
  icon: IconName;
  tint: string;
  title: string;
  children: ReactNode;
}

/** One outlined dark card per group of fields, headed by a solid icon tile. */
function Section({ icon, tint, title, children }: SectionProps) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={[styles.sectionIcon, { backgroundColor: tint }]}>
          <Ionicons name={icon} size={18} color="#FFFFFF" />
        </View>
        <AppText variant="heading" color={home.text} accessibilityRole="header" style={styles.sectionTitle}>
          {title}
        </AppText>
      </View>
      {children}
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.field}>
      <AppText variant="captionStrong" color={home.textMuted} style={styles.label}>
        {label}
      </AppText>
      {children}
    </View>
  );
}

const createStyles = (home: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: home.background },
  flex: { flex: 1 },
  // Same bar as the profile and resources tabs.
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
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: home.rim,
    backgroundColor: home.panel,
  },
  content: { gap: spacing.xl, padding: spacing.xl },
  section: {
    gap: spacing.xl,
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderBottomWidth: 6,
    borderColor: home.rim,
    backgroundColor: home.panel,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sectionIcon: { width: 34, height: 34, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { flex: 1, fontWeight: '800' },
  field: { gap: spacing.sm },
  label: { textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: spacing.xs },
  input: {
    ...typography.bodyStrong,
    height: 56,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: home.rim,
    backgroundColor: home.track,
    color: home.text,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    height: 56,
    paddingHorizontal: spacing.lg,
    borderWidth: 2,
    borderColor: home.rim,
    backgroundColor: home.track,
  },
  flag: { fontSize: 24, lineHeight: 30 },
  footer: {
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: home.header,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: home.divider,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: home.dangerFill,
  },
});
