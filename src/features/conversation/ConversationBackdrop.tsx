import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import type { Scenario } from '@/types';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

/** Scenario photo that fades into the screen background, like a stage behind the tutor. */
export function ConversationBackdrop({ scenario }: { scenario: Scenario }) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  // Hex alpha suffix: the page colour at 90% just above the bottom edge.
  const fade = ['rgba(8,24,40,0.55)', 'rgba(8,24,40,0.08)', `${home.background}E6`, home.background] as const;
  const { height } = useWindowDimensions();
  const stage = { height: height * 0.58 };

  return (
    <View style={[styles.stage, stage]} pointerEvents="none">
      <Image source={scenario.image} contentFit="cover" blurRadius={3} transition={250} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={fade} locations={[0, 0.32, 0.88, 1]} style={StyleSheet.absoluteFill} />
    </View>
  );
}

const createStyles = (home: Palette) => StyleSheet.create({
  stage: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: home.primarySoft },
});
