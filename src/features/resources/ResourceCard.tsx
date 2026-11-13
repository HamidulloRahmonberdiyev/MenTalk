import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Pressable3D } from '@/components/ui/Pressable3D';
import { haptics } from '@/services/haptics';
import { radii, spacing } from '@/theme';
import type { IconName } from '@/types';

export interface Resource {
  key: string;
  title: string;
  /** Small line under the title, e.g. how many words are waiting. */
  hint?: string;
  icon: IconName;
  /** 3D object on a transparent background; without one the icon is drawn instead. */
  image?: ImageSource | number;
  gradient: readonly [string, string];
  edge: string;
  onPress: () => void;
}

/** Same shape as the big home cards (talk, dictionary, path). */
const RADIUS = 34;
const ART = 124;

/**
 * A big resource card in the home cards' style: gradient face on a raised edge, quiet light orbs,
 * a bold title with its hint in a deep pill, and a 3D object glowing on the right.
 */
export function ResourceCard({ title, hint, icon, image, gradient, edge, onPress }: Omit<Resource, 'key'>) {
  return (
    <Pressable3D
      accessibilityRole="button"
      accessibilityLabel={hint ? `${title}. ${hint}` : title}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      edgeColor={edge}
      depth={6}
      radius={RADIUS}
    >
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.face}>
        <View pointerEvents="none" style={[styles.orb, styles.orbA]} />
        <View pointerEvents="none" style={[styles.orb, styles.orbB]} />

        <View style={styles.art} pointerEvents="none">
          <View style={styles.halo} />
          <View style={styles.floor} />
          {image ? (
            <Image source={image} style={styles.image} contentFit="contain" transition={150} />
          ) : (
            <View style={styles.iconArt}>
              <Ionicons name={icon} size={92} color="rgba(20, 10, 60, 0.2)" style={styles.iconShadow} />
              <Ionicons name={icon} size={92} color="rgba(255, 255, 255, 0.9)" />
            </View>
          )}
        </View>

        <AppText color="#FFFFFF" numberOfLines={2} adjustsFontSizeToFit style={styles.title}>
          {title}
        </AppText>
        {hint ? (
          <View style={[styles.pill, { backgroundColor: edge }]}>
            <AppText color="#FFFFFF" numberOfLines={1} adjustsFontSizeToFit style={styles.pillText}>
              {hint}
            </AppText>
          </View>
        ) : null}
      </LinearGradient>
    </Pressable3D>
  );
}

const styles = StyleSheet.create({
  face: {
    minHeight: 156,
    justifyContent: 'center',
    gap: spacing.md,
    paddingLeft: spacing.xl,
    paddingRight: ART + spacing.md,
    paddingVertical: spacing.lg,
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  orb: { position: 'absolute', borderRadius: 999 },
  orbA: { width: 190, height: 190, top: -80, right: -40, backgroundColor: 'rgba(255, 255, 255, 0.16)' },
  orbB: { width: 120, height: 120, bottom: -64, left: -36, backgroundColor: 'rgba(255, 255, 255, 0.1)' },

  // The object stays fully inside the card, tilted a little, like the home cards' art.
  art: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    width: ART,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-8deg' }],
  },
  halo: {
    position: 'absolute',
    width: ART * 0.74,
    height: ART * 0.74,
    borderRadius: ART,
    backgroundColor: 'rgba(255, 255, 255, 0.26)',
    boxShadow: '0 0 30px 10px rgba(255, 255, 255, 0.32)',
  },
  floor: {
    position: 'absolute',
    bottom: '16%',
    width: ART * 0.5,
    height: 10,
    borderRadius: ART,
    backgroundColor: 'rgba(20, 20, 80, 0.2)',
    boxShadow: '0 0 10px 4px rgba(20, 20, 80, 0.16)',
  },
  image: { width: ART, height: ART },
  iconArt: { alignItems: 'center', justifyContent: 'center' },
  iconShadow: { position: 'absolute', transform: [{ translateX: 5 }, { translateY: 5 }] },

  title: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  pill: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingVertical: 7,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    boxShadow: '0 3px 8px rgba(20, 20, 80, 0.2)',
  },
  pillText: { fontSize: 14, lineHeight: 18, fontWeight: '800' },
});
