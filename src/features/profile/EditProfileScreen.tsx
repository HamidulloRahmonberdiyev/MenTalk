import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { saveProfile, type ProfileEdits } from '@/services/session';
import { useSettingsStore } from '@/store/settingsStore';
import { useUserStore } from '@/store/userStore';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import type { LearningGoal } from '@/types';

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
  const t = useT();
  const language = useSettingsStore((state) => state.language);
  const { height } = useWindowDimensions();

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
    <Screen>
      <ScreenHeader title={t('profile.edit')} onBack={leave} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Field label={t('profile.field.name')}>
            <TextInput
              value={form.name}
              onChangeText={(value) => set('name', value)}
              placeholder={t('onb.name.placeholder')}
              placeholderTextColor={colors.textMuted}
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
            <PressableScale accessibilityRole="button" onPress={() => setPickingCountry(true)} style={styles.select}>
              <AppText style={styles.flag}>{country ? flagOf(country) : '🌍'}</AppText>
              <AppText variant="bodyStrong" color={country ? colors.text : colors.textMuted} style={styles.flex} numberOfLines={1}>
                {country ? (countryName(country, language) ?? country) : t('profile.countryNone')}
              </AppText>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </PressableScale>
          </Field>

          <Field label={t('profile.field.birth')}>
            <BirthDateField value={birth} onChange={setBirth} parsed={parsedBirth} autoFocus={false} />
          </Field>

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
        </ScrollView>

        <View style={styles.footer}>
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
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <AppText variant="captionStrong" color={colors.textSecondary} style={styles.label}>
        {label}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  field: { gap: spacing.sm },
  label: { textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: spacing.xs },
  input: {
    ...typography.bodyStrong,
    height: 56,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    height: 56,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  flag: { fontSize: 24, lineHeight: 30 },
  footer: { gap: spacing.md, paddingTop: spacing.md },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.dangerSoft,
    ...shadows.card,
  },
});
