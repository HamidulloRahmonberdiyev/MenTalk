import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { colors, radii, shadows } from '@/theme';

const CONFETTI = [
  { top: 8, left: 22, color: colors.primary, rotate: '30deg' },
  { top: 44, left: 62, color: colors.warning, rotate: '-20deg' },
  { top: 96, left: 8, color: colors.warning, rotate: '50deg' },
  { top: 4, right: 30, color: colors.warning, rotate: '15deg' },
  { top: 52, right: 60, color: colors.purple, rotate: '-40deg' },
  { top: 100, right: 14, color: colors.danger, rotate: '25deg' },
] as const;

export function TrophyHero() {
  return (
    <View style={styles.wrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {CONFETTI.map((piece, index) => (
        <View
          key={index}
          style={[styles.confetti, { backgroundColor: piece.color, transform: [{ rotate: piece.rotate }] }, piece]}
        />
      ))}
      <Animated.View entering={ZoomIn.springify().damping(12)} style={shadows.primary}>
        <LinearGradient
          colors={[colors.primaryLight, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.badge}
        >
          <Ionicons name="trophy" size={56} color="#FFFFFF" />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 150,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    width: 104,
    height: 104,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confetti: {
    position: 'absolute',
    width: 8,
    height: 16,
    borderRadius: 3,
  },
});
