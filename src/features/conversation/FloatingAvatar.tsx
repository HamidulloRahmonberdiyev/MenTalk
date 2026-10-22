import { AIFace, CHAT_MASCOT, TutorAvatar, type FaceEmotion, type FaceState, type SpeechFace } from '@/features/face';

interface FloatingAvatarProps {
  state: FaceState;
  emotion: FaceEmotion;
  /** Lip-sync of the line being spoken. */
  speech?: SpeechFace;
  /** Nominal head size. */
  size: number;
}

/** The assistant's 3D head (or the SOBO mascot, see `CHAT_MASCOT`) floating over the scenario backdrop. */
export function FloatingAvatar({ state, emotion, speech, size }: FloatingAvatarProps) {
  if (CHAT_MASCOT === 'rive') {
    return <AIFace variant="rive" state={state} emotion={emotion} audioLevel={speech?.jaw} size={size} />;
  }
  return <TutorAvatar state={state} emotion={emotion} speech={speech} size={size} />;
}
