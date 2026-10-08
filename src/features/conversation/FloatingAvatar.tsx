import { AIMascot, type AudioLevel, type FaceEmotion, type FaceState } from '@/features/face';

interface FloatingAvatarProps {
  state: FaceState;
  emotion: FaceEmotion;
  audioLevel?: AudioLevel;
  /** Width of the mascot's body. */
  size: number;
}

/** The assistant mascot floating over the scenario backdrop. */
export function FloatingAvatar({ state, emotion, audioLevel, size }: FloatingAvatarProps) {
  return <AIMascot state={state} emotion={emotion} audioLevel={audioLevel} size={size} />;
}
