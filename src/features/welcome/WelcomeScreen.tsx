import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { isApiConfigured } from '@/services/api/config';
import { authService } from '@/services/auth';
import { haptics } from '@/services/haptics';
import { useUserStore } from '@/store/userStore';
import { radii, spacing } from '@/theme';

import { LanguageChips } from './LanguageChips';

const BACKGROUND = require('../../../assets/app/moscow.png');
const OVERLAY_COLORS = ['rgba(8,6,28,0.45)', 'rgba(8,6,28,0.15)', 'rgba(8,6,28,0.65)', 'rgba(8,6,28,0.92)'] as const;
const OVERLAY_LOCATIONS = [0, 0.3, 0.62, 1] as const;

/** Signs a returning learner straight in. Resolves to true while the check is running. */
function useRestoredSession(): boolean {
  const [checking, setChecking] = useState(isApiConfigured);

  useEffect(() => {
    if (!isApiConfigured) return;
    let active = true;
    authService.restore().then((user) => {
      if (!active) return;
      if (user) router.replace(useUserStore.getState().onboarded ? '/home' : '/onboarding');
      else setChecking(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return checking;
}

export function WelcomeScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const checking = useRestoredSession();

  const goToAuth = () => router.push('/auth');

  if (checking) return <View style={styles.root} />;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Image source={BACKGROUND} contentFit="cover" contentPosition="center" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={OVERLAY_COLORS}
        locations={OVERLAY_LOCATIONS}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + spacing.lg,
            paddingBottom: Math.max(insets.bottom, spacing.xl) + spacing.lg,
          },
        ]}
      >
        <LanguageChips />

        <View style={styles.spacer} />

        <Animated.View entering={FadeInDown.duration(500)} style={styles.copy}>
          <AppText variant="display" color="#FFFFFF" accessibilityRole="header">
            {t('welcome.line1')}
            {'\n'}
            {t('welcome.line2')}
            {'\n'}
            {t('welcome.line3')}
          </AppText>
          <AppText variant="body" color="rgba(255,255,255,0.75)" style={styles.description}>
            {t('welcome.description')}
          </AppText>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(500).delay(150)} style={styles.actions}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t('welcome.start')}
            onPress={() => {
              haptics.light();
              goToAuth();
            }}
            style={styles.startButton}
          >
            <LinearGradient
              colors={['#4FC0F5', '#229ED9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.startButtonFill}
            >
              <AppText variant="button" color="#FFFFFF">
                {t('welcome.start')}
              </AppText>
              <AppText variant="button" color="#FFFFFF">
                {' →'}
              </AppText>
            </LinearGradient>
          </PressableScale>

          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t('welcome.haveAccount')}
            onPress={() => {
              haptics.selection();
              goToAuth();
            }}
            style={styles.secondaryAction}
          >
            <AppText variant="bodyStrong" color="rgba(255,255,255,0.8)">
              {t('welcome.haveAccount')}
            </AppText>
          </PressableScale>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0F2B',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  copy: {
    gap: spacing.md,
    marginBottom: spacing.xxxl,
  },
  description: {
    maxWidth: 320,
  },
  spacer: {
    flex: 1,
  },
  actions: {
    gap: spacing.lg,
  },
  startButton: {
    height: 58,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  startButtonFill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  secondaryAction: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
});
