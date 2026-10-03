import { StyleSheet } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { AIFace, type AudioLevel, type FaceEmotion, type FaceState } from '@/features/face';
import { radii, spacing } from '@/theme';

interface FloatingAvatarProps {
  state: FaceState;
  emotion: FaceEmotion;
  audioLevel?: AudioLevel;
  /** Width of the face itself; the glass frame grows around it. */
  size: number;
}

/** The tutor's face on a frosted glass tile, floating over the scenario backdrop. */
export function FloatingAvatar({ state, emotion, audioLevel, size }: FloatingAvatarProps) {
  return (
    <GlassCard intensity={55} style={styles.tile}>
      <AIFace state={state} emotion={emotion} audioLevel={audioLevel} size={size} />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  tile: {
    padding: spacing.xl,
    borderRadius: radii.xl + 6,
    boxShadow: '0 22px 48px rgba(10, 60, 100, 0.28)',
  },
});
