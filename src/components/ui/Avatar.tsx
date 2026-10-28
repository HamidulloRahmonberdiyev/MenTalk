import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { colors } from '@/theme';

import { AppText } from './AppText';

interface AvatarProps {
  name: string;
  uri: string | null;
  size: number;
}

/** Profile photo, or the name's initial on a gradient when there is none or it fails to load. */
export function Avatar({ name, uri, size }: AvatarProps) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const box = { width: size, height: size, borderRadius: size / 2 };

  if (uri && uri !== failedUri) {
    return (
      <Image
        source={{ uri }}
        style={box}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
        accessibilityIgnoresInvertColors
        onError={() => setFailedUri(uri)}
      />
    );
  }

  return (
    <LinearGradient colors={[colors.primaryLight, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[box, styles.fallback]}>
      <AppText color={colors.onPrimary} style={{ fontSize: size * 0.42, lineHeight: size * 0.5, fontWeight: '800' }}>
        {name.trim().charAt(0).toUpperCase()}
      </AppText>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
