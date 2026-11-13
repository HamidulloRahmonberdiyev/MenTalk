import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { useUserStore } from '@/store/userStore';
import { radii, spacing } from '@/theme';
import type { IconName } from '@/types';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { countUnread, useNotificationsStore } from '../notifications/notificationsStore';
import { countDue, useStudyCards } from '../vocabulary/vocabularyStore';
import { HERO_TONES } from './heroColors';

interface HeaderButtonProps {
  icon: IconName;
  label: string;
  href: Href;
  badge?: number;
}

function HeaderButton({ icon, label, href, badge = 0 }: HeaderButtonProps) {
  const styles = useThemedStyles(createStyles);
  const ink = HERO_TONES[usePalette().appearance].deep;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={badge > 0 ? `${label}: ${badge}` : label}
      hitSlop={8}
      onPress={() => {
        haptics.selection();
        router.navigate(href);
      }}
      style={styles.iconButton}
    >
      <Ionicons name={icon} size={21} color={ink} />
      {badge > 0 ? (
        <View style={styles.badge}>
          <AppText color="#FFFFFF" style={styles.badgeText}>
            {badge > 99 ? '99+' : badge}
          </AppText>
        </View>
      ) : null}
    </PressableScale>
  );
}

export function HomeHeader({ name }: { name: string }) {
  const styles = useThemedStyles(createStyles);
  const t = useT();
  const avatarUrl = useUserStore((state) => state.avatarUrl);
  const due = countDue(useStudyCards());
  const unread = useNotificationsStore(countUnread);

  // Until the server sends notifications, a first launch gets the demo set so the bell has something to show.
  useEffect(() => useNotificationsStore.getState().seedDemo(), []);

  return (
    <View style={styles.row}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t('tab.profile')}
        hitSlop={8}
        onPress={() => router.navigate('/profile')}
        style={styles.avatar}
      >
        <Avatar name={name} uri={avatarUrl} size={38} />
      </PressableScale>
      <AppText variant="heading" color="#FFFFFF" accessibilityRole="header" numberOfLines={1} style={styles.title}>
        {t('home.greetingName', { name })}
      </AppText>
      <HeaderButton icon="notifications-outline" label={t('notif.title')} href="/notifications" badge={unread} />
      <HeaderButton icon="book-outline" label={t('tab.words')} href="/words" badge={due} />
    </View>
  );
}

/** Drop shadow under the white keys, tinted to the band. */
const SHADOW = {
  light: 'rgba(8, 70, 140, 0.28)',
  dark: 'rgba(0, 10, 40, 0.45)',
} as const;

const createStyles = (home: Palette) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  // Solid white ring with a soft drop, so the avatar sits on the band instead of melting into it.
  avatar: {
    padding: 2,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
    boxShadow: `0 4px 12px ${SHADOW[home.appearance]}`,
  },
  title: {
    flex: 1,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    textShadowColor: 'rgba(0, 30, 80, 0.18)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  // Solid white keys with the band's deep ink: readable on the bright sky band and the night one alike.
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    boxShadow: `0 4px 12px ${SHADOW[home.appearance]}`,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: home.badge,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '800',
  },
});
