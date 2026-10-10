import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { Card } from '@/components/ui/Card';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { TabScreen } from '@/components/ui/TabScreen';
import { useT } from '@/i18n';
import { authService } from '@/services/auth';
import { haptics } from '@/services/haptics';
import { endSession } from '@/services/session';
import { useUserStore } from '@/store/userStore';
import { colors, radii, shadows, spacing } from '@/theme';

import { LanguageSwitcher } from './LanguageSwitcher';
import { StatTile } from './StatTile';

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export function ProfileScreen() {
  const t = useT();
  const name = useUserStore((state) => state.name);
  const goal = useUserStore((state) => state.dailyGoalMinutes);
  const history = useUserStore((state) => state.history);

  const totalMinutes = Math.round(sum(history.map((entry) => entry.durationSec)) / 60);
  const average = history.length ? (sum(history.map((entry) => entry.score)) / history.length).toFixed(1) : '–';

  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const logout = async () => {
    setSigningOut(true);
    await authService.signOut().catch(() => undefined);
    endSession();
    router.replace('/');
  };

  return (
    <TabScreen>
      <AppText variant="title" accessibilityRole="header">
        {t('profile.title')}
      </AppText>

      <Card style={styles.identity}>
        <LinearGradient
          colors={[colors.primaryLight, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatar}
        >
          <AppText variant="title" color={colors.onPrimary}>
            {name.charAt(0).toUpperCase()}
          </AppText>
        </LinearGradient>
        <View style={styles.texts}>
          <AppText variant="heading">{name}</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {t('profile.goal', { n: goal })}
          </AppText>
        </View>
      </Card>

      <View style={styles.stats}>
        <StatTile icon="chatbubbles" tint={colors.primary} value={`${history.length}`} label={t('profile.statTalks')} />
        <StatTile icon="time" tint={colors.success} value={`${totalMinutes}`} label={t('profile.statMinutes')} />
        <StatTile icon="star" tint={colors.warning} value={average} label={t('profile.statRating')} />
      </View>

      <View style={styles.language}>
        <AppText variant="heading">{t('profile.language')}</AppText>
        <LanguageSwitcher />
      </View>

      {__DEV__ ? (
        <PressableScale accessibilityRole="button" onPress={() => router.push('/face-lab' as Href)} style={styles.logout}>
          <AppText variant="bodyStrong" color={colors.primary}>
            Face lab
          </AppText>
        </PressableScale>
      ) : null}

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t('profile.logout')}
        onPress={() => {
          haptics.light();
          setConfirmingLogout(true);
        }}
        style={styles.logout}
      >
        <Ionicons name="log-out-outline" size={22} color={colors.danger} />
        <AppText variant="bodyStrong" color={colors.danger}>
          {t('profile.logout')}
        </AppText>
      </PressableScale>

      <ConfirmSheet
        visible={confirmingLogout}
        icon="log-out-outline"
        title={t('profile.logoutTitle')}
        message={t('profile.logoutMessage')}
        confirmLabel={t('profile.logout')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={signingOut}
        onConfirm={logout}
        onCancel={() => setConfirmingLogout(false)}
      />
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    borderRadius: radii.xl,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.primary,
  },
  texts: { flex: 1, gap: 2 },
  stats: { flexDirection: 'row', gap: spacing.md },
  logout: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  language: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
});
