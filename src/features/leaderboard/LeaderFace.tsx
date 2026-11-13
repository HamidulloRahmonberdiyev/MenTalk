import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

interface LeaderFaceProps {
  uri: string | null;
  size: number;
}

/** A learner's photo, or a grey silhouette when there is none or it fails to load. */
export function LeaderFace({ uri, size }: LeaderFaceProps) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const box = { width: size, height: size, borderRadius: size / 2 };

  if (uri && uri !== failedUri) {
    return (
      <Image
        source={{ uri }}
        style={box}
        contentFit="cover"
        cachePolicy="memory-disk"
        accessibilityIgnoresInvertColors
        onError={() => setFailedUri(uri)}
      />
    );
  }

  return (
    <View style={[box, styles.silhouette]}>
      <Ionicons name="person" size={size * 0.78} color="#A8A8A8" style={{ marginBottom: -size * 0.1 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  silhouette: { alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden', backgroundColor: '#EFEFEF' },
});
