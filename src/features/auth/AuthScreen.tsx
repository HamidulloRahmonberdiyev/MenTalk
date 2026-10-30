import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { ApiError } from '@/services/api/http';
import { GoogleUnavailable, SignInCancelled, authService } from '@/services/auth';
import { haptics } from '@/services/haptics';
import { useUserStore } from '@/store/userStore';
import { radii, spacing } from '@/theme';

const BACKGROUND = require('../../../assets/app/samarkand.png');
const OVERLAY_COLORS = ['rgba(8,6,28,0.55)', 'rgba(8,6,28,0.55)', 'rgba(8,6,28,0.92)'] as const;

export function AuthScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const setName = useUserStore((state) => state.setName);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<'failed' | 'unavailable' | null>(null);
  // TEMP: shows the raw error under the message to diagnose Google sign-in; remove once it works.
  const [failureDetail, setFailureDetail] = useState<string | null>(null);

  const signIn = async () => {
    haptics.light();
    setLoading(true);
    setFailure(null);
    setFailureDetail(null);
    try {
      const user = await authService.signInWithGoogle();
      setName(user.name);
      haptics.success();
      router.replace(useUserStore.getState().onboarded ? '/home' : '/onboarding');
    } catch (error) {
      if (__DEV__) console.warn('Sign-in failed:', error);
      if (error instanceof GoogleUnavailable) setFailure('unavailable');
      else if (!(error instanceof SignInCancelled)) setFailure('failed');
      setFailureDetail(describeError(error));
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Image source={BACKGROUND} contentFit="cover" style={StyleSheet.absoluteFill} />
      <LinearGradient colors={OVERLAY_COLORS} style={StyleSheet.absoluteFill} pointerEvents="none" />

      <View
        style={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: Math.max(insets.bottom, spacing.xl) },
        ]}
      >
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </PressableScale>

        <View style={styles.spacer} />

        <Animated.View entering={FadeInDown.duration(500)} style={styles.body}>
          <AppText variant="title" color="#FFFFFF" accessibilityRole="header">
            {t('auth.title')}
          </AppText>
          <AppText variant="body" color="rgba(255,255,255,0.75)">
            {t('auth.subtitle')}
          </AppText>

          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t('auth.google')}
            disabled={loading}
            onPress={signIn}
            style={styles.googleButton}
          >
            {loading ? (
              <ActivityIndicator color="#1F1F1F" />
            ) : (
              <Ionicons name="logo-google" size={20} color="#1F1F1F" />
            )}
            <AppText variant="button" color="#1F1F1F">
              {loading ? t('auth.loading') : t('auth.google')}
            </AppText>
          </PressableScale>

          {failure ? (
            <AppText variant="caption" color="#FF8A8A" style={styles.center}>
              {t(failure === 'unavailable' ? 'auth.unavailable' : 'auth.error')}
            </AppText>
          ) : null}
          {failure && failureDetail ? (
            <AppText variant="caption" color="#FF8A8A" style={styles.center} selectable>
              {failureDetail}
            </AppText>
          ) : null}

          <AppText variant="caption" color="rgba(255,255,255,0.6)" style={styles.center}>
            {t('auth.terms')}
          </AppText>
        </Animated.View>
      </View>
    </View>
  );
}

/** Google Sign-In errors carry a `code` (e.g. DEVELOPER_ERROR / 10), API errors an HTTP `status`. */
function describeError(error: unknown): string {
  if (error instanceof ApiError) return `API ${error.status}${error.type ? ` · ${error.type}` : ''}`;
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    return code !== undefined ? `[${String(code)}] ${error.message}` : `${error.name}: ${error.message}`;
  }
  return String(error);
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0F2B', overflow: 'hidden' },
  content: { flex: 1, paddingHorizontal: spacing.xl },
  back: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  spacer: { flex: 1 },
  body: { gap: spacing.md },
  googleButton: {
    height: 58,
    marginTop: spacing.lg,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
  },
  center: { textAlign: 'center' },
});
