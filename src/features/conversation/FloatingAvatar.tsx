import { TutorAvatar, type FaceEmotion, type FaceState, type SpeechFace } from '@/features/face';

interface FloatingAvatarProps {
  state: FaceState;
  emotion: FaceEmotion;
  /** Lip-sync of the line being spoken. */
  speech?: SpeechFace;
  /** Nominal head size. */
  size: number;
}

/** The assistant's 3D head floating over the scenario backdrop. */
export function FloatingAvatar({ state, emotion, speech, size }: FloatingAvatarProps) {
  return <TutorAvatar state={state} emotion={emotion} speech={speech} size={size} />;
}
