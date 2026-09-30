import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { radii, spacing } from '@/theme';

import { CathedralSkyline } from './CathedralSkyline';
import { LanguageChips } from './LanguageChips';

const SKY_COLORS = ['#0B0F2B', '#211A4A', '#4B2960', '#8A4A55'] as const;
const SKY_LOCATIONS = [0, 0.45, 0.78, 1] as const;

export function WelcomeScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const skylineHeight = Math.min(Math.max(height * 0.13, 100), 140);

  const goToApp = () => router.replace('/home');

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient colors={SKY_COLORS} locations={SKY_LOCATIONS} style={StyleSheet.absoluteFill} />
      <View style={[styles.skyline, { height: skylineHeight }]} pointerEvents="none">
        <CathedralSkyline width={width} height={skylineHeight} color="#080A1F" />
      </View>

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + spacing.lg,
            paddingBottom: Math.max(insets.bottom, spacing.xl) + skylineHeight * 0.6,
          },
        ]}
      >
        <LanguageChips />

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

        <View style={styles.spacer} />

        <Animated.View entering={FadeIn.duration(500).delay(150)} style={styles.actions}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t('welcome.start')}
            onPress={() => {
              haptics.light();
              goToApp();
            }}
            style={styles.startButton}
          >
            <LinearGradient
              colors={['#8B6CFF', '#5B4CE0']}
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
              goToApp();
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
  },
  skyline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  copy: {
    paddingTop: spacing.xxxl,
    gap: spacing.lg,
  },
  description: {
    maxWidth: 300,
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
