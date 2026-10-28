import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useShallow } from 'zustand/react/shallow';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { useSettingsStore } from '@/store/settingsStore';
import { useUserStore } from '@/store/userStore';
import { colors, radii, shadows, spacing } from '@/theme';
import { enter } from '@/theme/motion';

import { countryName, flagOf } from '../onboarding/countries';
import { LEVELS } from '../onboarding/options';
import { useVocabularyStore, visibleStreak } from '../vocabulary/vocabularyStore';
import { AvatarSheet } from './AvatarSheet';
import { useAvatarEditor } from './useAvatarEditor';

const AVATAR = 112;
const GLASS = 'rgba(255, 255, 255, 0.18)';
const ON_GLASS_MUTED = 'rgba(255, 255, 255, 0.82)';

export function ProfileHero() {
  const t = useT();
  const language = useSettingsStore((state) => state.language);
  const { name, email, avatarUrl, avatarCustom, level, country, dailyGoalMinutes } = useUserStore(
    useShallow(({ name, email, avatarUrl, avatarCustom, level, country, dailyGoalMinutes }) => ({
      name,
      email,
      avatarUrl,
      avatarCustom,
      level,
      country,
      dailyGoalMinutes,
    })),
  );
  const xp = useVocabularyStore((state) => state.xp);
  const streak = useVocabularyStore((state) => visibleStreak(state));
  const avatar = useAvatarEditor();

  const levelEmoji = LEVELS.find(({ id }) => id === level)?.emoji;
  const chips = [
    level ? `${levelEmoji} ${t(`onb.level.${level}`)}` : null,
    country && country.length === 2 ? `${flagOf(country)} ${countryName(country, language) ?? country}` : null,
  ].filter((chip): chip is string => chip !== null);

  const stats = [
    { emoji: '🔥', value: `${streak}`, label: t('practice.stat.streak') },
    { emoji: '⚡', value: `${xp}`, label: 'XP' },
    { emoji: '🎯', value: t('common.minutes', { n: dailyGoalMinutes }), label: t('profile.field.daily') },
  ];

  return (
    <Animated.View entering={enter.rise()} style={styles.card}>
      <LinearGradient colors={['#62C6F8', colors.primary, '#1A86CF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.bubble, styles.bubbleLarge]} pointerEvents="none" />
      <View style={[styles.bubble, styles.bubbleSmall]} pointerEvents="none" />

      <View style={styles.topBar}>
        <AppText variant="heading" color={colors.onPrimary} accessibilityRole="header">
          {t('profile.title')}
        </AppText>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t('profile.edit')}
          hitSlop={8}
          onPress={() => {
            haptics.light();
            router.push('/profile-edit');
          }}
          style={styles.glassButton}
        >
          <Ionicons name="create-outline" size={20} color={colors.onPrimary} />
        </PressableScale>
      </View>

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t('profile.photo.change')}
        disabled={avatar.busy}
        onPress={() => {
          haptics.light();
          avatar.open();
        }}
        style={styles.avatarRing}
      >
        <Avatar name={name} uri={avatarUrl} size={AVATAR} />
        {avatar.busy ? (
          <View style={styles.busy}>
            <ActivityIndicator color={colors.onPrimary} />
          </View>
        ) : null}
        <View style={styles.cameraBadge}>
          <Ionicons name="camera" size={16} color={colors.primary} />
        </View>
      </PressableScale>

      <View style={styles.identity}>
        <AppText variant="title" color={colors.onPrimary} numberOfLines={1} style={styles.center}>
          {name}
        </AppText>
        {email ? (
          <AppText variant="caption" color={ON_GLASS_MUTED} numberOfLines={1}>
            {email}
          </AppText>
        ) : null}
      </View>

      {chips.length ? (
        <View style={styles.chips}>
          {chips.map((chip) => (
            <View key={chip} style={styles.chip}>
              <AppText variant="captionStrong" color={colors.onPrimary}>
                {chip}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}

      {avatar.error ? (
        <Animated.View entering={enter.fade()} style={styles.error}>
          <Ionicons name="alert-circle" size={18} color={colors.danger} />
          <AppText variant="caption" color={colors.danger} style={styles.flex}>
            {t(avatar.error === 'denied' ? 'profile.photo.denied' : 'profile.photo.failed')}
          </AppText>
        </Animated.View>
      ) : null}

      <View style={styles.stats}>
        {stats.map(({ emoji, value, label }, index) => (
          <View key={label} style={[styles.stat, index > 0 && styles.statDivider]} accessible accessibilityLabel={`${label}: ${value}`}>
            <AppText variant="subheading" color={colors.onPrimary} numberOfLines={1}>
              {`${emoji} ${value}`}
            </AppText>
            <AppText variant="caption" color={ON_GLASS_MUTED} numberOfLines={1}>
              {label}
            </AppText>
          </View>
        ))}
      </View>

      <AvatarSheet
        visible={avatar.sheetOpen}
        canRemove={avatarCustom}
        onSelect={avatar.select}
        onClose={avatar.close}
        onClosed={avatar.onSheetClosed}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.primary,
  },
  bubble: { position: 'absolute', borderRadius: radii.pill, backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  bubbleLarge: { width: 260, height: 260, top: -120, right: -80 },
  bubbleSmall: { width: 140, height: 140, bottom: 40, left: -60 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch' },
  glassButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GLASS,
  },
  avatarRing: {
    padding: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  busy: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14, 27, 44, 0.45)',
  },
  cameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    ...shadows.raised,
  },
  identity: { alignItems: 'center', gap: 2, alignSelf: 'stretch' },
  center: { textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: GLASS },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'stretch',
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.dangerSoft,
  },
  flex: { flex: 1 },
  stats: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginTop: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: GLASS,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: spacing.xs },
  statDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: 'rgba(255, 255, 255, 0.45)' },
});
