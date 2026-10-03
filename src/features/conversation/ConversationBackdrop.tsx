import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { colors } from '@/theme';
import type { Scenario } from '@/types';

const FADE = ['rgba(8,24,40,0.55)', 'rgba(8,24,40,0.08)', 'rgba(241,247,251,0.9)', colors.background] as const;

/** Scenario photo that fades into the screen background, like a stage behind the tutor. */
export function ConversationBackdrop({ scenario }: { scenario: Scenario }) {
  const { height } = useWindowDimensions();
  const stage = { height: height * 0.58 };

  return (
    <View style={[styles.stage, stage]} pointerEvents="none">
      <Image source={scenario.image} contentFit="cover" blurRadius={3} transition={250} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={FADE} locations={[0, 0.32, 0.88, 1]} style={StyleSheet.absoluteFill} />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: colors.primarySoft },
});
