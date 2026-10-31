import { Ionicons } from '@expo/vector-icons';
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
import { colors, radii, spacing } from '@/theme';
import { enter } from '@/theme/motion';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { countryName, flagOf } from '../onboarding/countries';
import { LEVELS } from '../onboarding/options';
import { AvatarSheet } from './AvatarSheet';
import { useAvatarEditor } from './useAvatarEditor';

const AVATAR = 96;

/** Who the learner is: photo, name, level and country, on an outlined dark panel. */
export function ProfileHero() {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const t = useT();
  const language = useSettingsStore((state) => state.language);
  const { name, email, avatarUrl, avatarCustom, level, country } = useUserStore(
    useShallow(({ name, email, avatarUrl, avatarCustom, level, country }) => ({ name, email, avatarUrl, avatarCustom, level, country })),
  );
  const avatar = useAvatarEditor();

  const levelEmoji = LEVELS.find(({ id }) => id === level)?.emoji;
  const chips = [
    level ? `${levelEmoji} ${t(`onb.level.${level}`)}` : null,
    country && country.length === 2 ? `${flagOf(country)} ${countryName(country, language) ?? country}` : null,
  ].filter((chip): chip is string => chip !== null);

  return (
    <Animated.View entering={enter.rise()} style={styles.card}>
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
          <Ionicons name="camera" size={16} color="#FFFFFF" />
        </View>
      </PressableScale>

      <View style={styles.identity}>
        <AppText variant="title" color={home.text} numberOfLines={1} style={styles.center}>
          {name}
        </AppText>
        {email ? (
          <AppText variant="caption" color={home.textMuted} numberOfLines={1}>
            {email}
          </AppText>
        ) : null}
      </View>

      {chips.length ? (
        <View style={styles.chips}>
          {chips.map((chip) => (
            <View key={chip} style={styles.chip}>
              <AppText variant="captionStrong" color={home.text}>
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

const createStyles = (home: Palette) => StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderBottomWidth: 6,
    borderColor: home.rim,
    borderBottomColor: home.rimBottom,
    backgroundColor: home.panel,
  },
  avatarRing: {
    padding: 4,
    borderRadius: radii.pill,
    borderWidth: 3,
    borderColor: colors.primary,
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
    backgroundColor: 'rgba(14, 27, 44, 0.55)',
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: home.panel,
  },
  identity: { alignItems: 'center', gap: 2, alignSelf: 'stretch' },
  center: { textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: home.rim,
    backgroundColor: home.track,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'stretch',
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: home.dangerFill,
  },
  flex: { flex: 1 },
});
