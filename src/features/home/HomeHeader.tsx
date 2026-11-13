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

interface HeaderButtonProps {
  icon: IconName;
  label: string;
  href: Href;
  badge?: number;
}

function HeaderButton({ icon, label, href, badge = 0 }: HeaderButtonProps) {
  const styles = useThemedStyles(createStyles);
  const ink = usePalette().text;
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
  const home = usePalette();
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
      <AppText variant="heading" color={home.text} accessibilityRole="header" numberOfLines={1} style={styles.title}>
        {t('home.greetingName', { name })}
      </AppText>
      <HeaderButton icon="notifications-outline" label={t('notif.title')} href="/notifications" badge={unread} />
      <HeaderButton icon="book-outline" label={t('tab.words')} href="/words" badge={due} />
    </View>
  );
}

/** Quiet chips on the flat page: white with a hairline by day, frosted by night. */
const CHIP = {
  light: {
    face: '#FFFFFF',
    rim: '#E6EAF2',
    shadow: '0 4px 12px rgba(16, 40, 90, 0.08)',
  },
  dark: {
    face: 'rgba(255, 255, 255, 0.08)',
    rim: 'rgba(255, 255, 255, 0.1)',
    shadow: 'none',
  },
} as const;

const createStyles = (home: Palette) => {
  const chip = CHIP[home.appearance];
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    avatar: {
      padding: 2,
      borderRadius: radii.pill,
      backgroundColor: chip.face,
      borderWidth: 1,
      borderColor: chip.rim,
      boxShadow: chip.shadow,
    },
    title: {
      flex: 1,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: chip.face,
      borderWidth: 1,
      borderColor: chip.rim,
      boxShadow: chip.shadow,
    },
    badge: {
      position: 'absolute',
      top: -3,
      right: -4,
      minWidth: 20,
      height: 20,
      paddingHorizontal: 5,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: home.badge,
      borderWidth: 2,
      borderColor: home.sheet,
    },
    badgeText: {
      fontSize: 11,
      lineHeight: 13,
      fontWeight: '800',
    },
  });
};
