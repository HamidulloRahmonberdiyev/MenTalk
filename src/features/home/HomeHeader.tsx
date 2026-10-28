import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { useUserStore } from '@/store/userStore';
import { colors, radii, shadows } from '@/theme';

export function HomeHeader({ name }: { name: string }) {
  const t = useT();
  const avatarUrl = useUserStore((state) => state.avatarUrl);

  return (
    <View style={styles.row}>
      <AppText variant="title" accessibilityRole="header" style={styles.title}>
        {t('home.greeting')}
        {'\n'}
        {name}! 👋
      </AppText>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t('tab.profile')}
        hitSlop={8}
        onPress={() => router.navigate('/profile')}
        style={styles.avatar}
      >
        <Avatar name={name} uri={avatarUrl} size={44} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: { flex: 1 },
  avatar: {
    padding: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
});
