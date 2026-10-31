import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { useUserStore } from '@/store/userStore';
import { radii, spacing } from '@/theme';
import type { IconName } from '@/types';

import { countDue, useStudyCards } from '../vocabulary/vocabularyStore';
import { home } from './homeTheme';

interface HeaderButtonProps {
  icon: IconName;
  label: string;
  href: Href;
  badge?: number;
}

function HeaderButton({ icon, label, href, badge = 0 }: HeaderButtonProps) {
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
      <Ionicons name={icon} size={28} color={home.text} />
      {badge > 0 ? (
        <View style={styles.badge}>
          <AppText color={home.text} style={styles.badgeText}>
            {badge > 99 ? '99+' : badge}
          </AppText>
        </View>
      ) : null}
    </PressableScale>
  );
}

export function HomeHeader({ name }: { name: string }) {
  const t = useT();
  const avatarUrl = useUserStore((state) => state.avatarUrl);
  const due = countDue(useStudyCards());

  return (
    <View style={styles.row}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t('tab.profile')}
        hitSlop={8}
        onPress={() => router.navigate('/profile')}
        style={styles.avatar}
      >
        <Avatar name={name} uri={avatarUrl} size={48} />
      </PressableScale>
      <AppText variant="heading" color={home.text} accessibilityRole="header" numberOfLines={1} style={styles.title}>
        {t('home.greetingName', { name })}
      </AppText>
      <HeaderButton icon="chatbubble-ellipses-outline" label={t('tab.conversations')} href="/conversations" />
      <HeaderButton icon="book-outline" label={t('tab.words')} href="/words" badge={due} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    padding: 3,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: '#8D929C',
  },
  title: {
    flex: 1,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderColor: home.background,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '800',
  },
});
