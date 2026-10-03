import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

interface GlassCardProps extends ViewProps {
  children?: ReactNode;
  intensity?: number;
  tint?: 'light' | 'dark';
}

/** Frosted-glass surface: blurred backdrop, translucent fill and a thin light edge. */
export function GlassCard({ children, style, intensity = 40, tint = 'light', ...rest }: GlassCardProps) {
  const dark = tint === 'dark';
  return (
    <View {...rest} style={[styles.card, dark ? styles.dark : styles.light, style]}>
      <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderWidth: 1,
  },
  light: { backgroundColor: 'rgba(255,255,255,0.38)', borderColor: 'rgba(255,255,255,0.7)' },
  dark: { backgroundColor: 'rgba(8,24,40,0.28)', borderColor: 'rgba(255,255,255,0.22)' },
});
