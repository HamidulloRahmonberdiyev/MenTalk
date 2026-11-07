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
import { colors, radii, spacing } from '@/theme';
import { enter } from '@/theme/motion';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { countryName, flagOf } from '../onboarding/countries';
import { LEVELS } from '../onboarding/options';
import { AvatarSheet } from './AvatarSheet';
import { useAvatarEditor } from './useAvatarEditor';

const AVATAR = 104;
/** Gradient ring + the gap of card colour between it and the photo. */
const RING = 5;
const GAP = 4;
const FRAME = AVATAR + (RING + GAP) * 2;
const BANNER = 118;

/** Sky to violet: the app's blue, warming into the tutor's purple. */
const COVER = ['#5EC2F7', '#3E7BEA', '#7B5CF0'] as const;
const HALO = ['#FFE07A', '#FF9F43', '#FF6B8B'] as const;

/** Who the learner is: a cover banner, the photo breaking out of it, then name, level and country. */
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
    level ? { key: 'level', text: `${levelEmoji} ${t(`onb.level.${level}`)}`, tint: '#1CB0F6' } : null,
    country && country.length === 2 ? { key: 'country', text: `${flagOf(country)} ${countryName(country, language) ?? country}`, tint: '#58CC02' } : null,
  ].filter((chip) => chip !== null);

  return (
    <Animated.View entering={enter.rise()} style={styles.card}>
      <LinearGradient colors={COVER} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
        {/* Soft bubbles and sparkles: decoration only, kept away from where the photo sits. */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={[styles.bubble, styles.bubbleBig]} />
          <View style={[styles.bubble, styles.bubbleMid]} />
          <View style={[styles.bubble, styles.bubbleSmall]} />
          <Ionicons name="sparkles" size={22} color="rgba(255,255,255,0.75)" style={styles.sparkleA} />
          <Ionicons name="star" size={12} color="rgba(255,255,255,0.6)" style={styles.sparkleB} />
          <Ionicons name="chatbubble-ellipses" size={30} color="rgba(255,255,255,0.22)" style={styles.sparkleC} />
        </View>

        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t('profile.edit')}
          hitSlop={8}
          onPress={() => {
            haptics.light();
            router.push('/profile-edit');
          }}
          style={styles.edit}
        >
          <Ionicons name="create-outline" size={18} color="#FFFFFF" />
        </PressableScale>
      </LinearGradient>

      <View style={styles.body}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t('profile.photo.change')}
          disabled={avatar.busy}
          onPress={() => {
            haptics.light();
            avatar.open();
          }}
          style={styles.avatarWrap}
        >
          <LinearGradient colors={HALO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.halo}>
            <View style={styles.haloGap}>
              <Avatar name={name} uri={avatarUrl} size={AVATAR} />
              {avatar.busy ? (
                <View style={styles.busy}>
                  <ActivityIndicator color={colors.onPrimary} />
                </View>
              ) : null}
            </View>
          </LinearGradient>
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={16} color="#FFFFFF" />
          </View>
        </PressableScale>

        <View style={styles.identity}>
          <AppText variant="title" color={home.text} numberOfLines={1} adjustsFontSizeToFit style={styles.center}>
            {name}
          </AppText>
          {email ? (
            <View style={styles.emailRow}>
              <Ionicons name="mail-outline" size={13} color={home.textMuted} />
              <AppText variant="caption" color={home.textMuted} numberOfLines={1} style={styles.emailText}>
                {email}
              </AppText>
            </View>
          ) : null}
        </View>

        {chips.length ? (
          <View style={styles.chips}>
            {chips.map((chip) => (
              <View key={chip.key} style={[styles.chip, { backgroundColor: `${chip.tint}1F`, borderColor: `${chip.tint}55` }]}>
                <AppText variant="captionStrong" color={home.text}>
                  {chip.text}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}

        {avatar.error ? (
          <Animated.View entering={enter.fade()} style={styles.error}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <AppText variant="caption" color={colors.danger} style={styles.flex}>
              {t(`profile.photo.${avatar.error}`)}
            </AppText>
          </Animated.View>
        ) : null}
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

const createStyles = (home: Palette) =>
  StyleSheet.create({
    card: {
      overflow: 'hidden',
      borderRadius: radii.xl,
      borderWidth: 2,
      borderBottomWidth: 6,
      borderColor: home.rim,
      borderBottomColor: home.rimBottom,
      backgroundColor: home.panel,
    },
    banner: { height: BANNER },
    bubble: { position: 'absolute', borderRadius: radii.pill, backgroundColor: 'rgba(255,255,255,0.14)' },
    bubbleBig: { width: 150, height: 150, top: -70, right: -40 },
    bubbleMid: { width: 90, height: 90, bottom: -48, left: -22 },
    bubbleSmall: { width: 34, height: 34, top: 22, left: '28%' },
    sparkleA: { position: 'absolute', top: 18, right: '30%' },
    sparkleB: { position: 'absolute', top: 58, left: 26 },
    sparkleC: { position: 'absolute', bottom: 14, right: 24, transform: [{ rotate: '-10deg' }] },
    edit: {
      position: 'absolute',
      top: spacing.md,
      right: spacing.md,
      width: 38,
      height: 38,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.22)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.45)',
    },

    body: {
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xl,
      // The photo sits half on the banner.
      marginTop: -FRAME / 2,
    },
    avatarWrap: { width: FRAME, height: FRAME },
    halo: { width: FRAME, height: FRAME, borderRadius: FRAME / 2, padding: RING },
    haloGap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: FRAME / 2,
      backgroundColor: home.panel,
    },
    busy: {
      position: 'absolute',
      width: AVATAR,
      height: AVATAR,
      borderRadius: AVATAR / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(14, 27, 44, 0.55)',
    },
    cameraBadge: {
      position: 'absolute',
      right: 2,
      bottom: 4,
      width: 36,
      height: 36,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderWidth: 3,
      borderColor: home.panel,
    },
    identity: { alignItems: 'center', gap: 4, alignSelf: 'stretch' },
    center: { textAlign: 'center' },
    emailRow: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '100%' },
    emailText: { flexShrink: 1 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radii.pill,
      borderWidth: 1.5,
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
