import type { FaceEmotion, FaceState, SpeechFace } from '@/features/face';
import { TutorFigure } from '@/features/tutor/TutorFigure';
import { useSettingsStore } from '@/store/settingsStore';

interface FloatingAvatarProps {
  state: FaceState;
  emotion: FaceEmotion;
  /** Lip-sync of the line being spoken. */
  speech?: SpeechFace;
  /** Nominal head size. */
  size: number;
}

/** The tutor the learner picked in the profile, floating over the scenario backdrop. */
export function FloatingAvatar({ state, emotion, speech, size }: FloatingAvatarProps) {
  const character = useSettingsStore((settings) => settings.tutorCharacter);
  const tone = useSettingsStore((settings) => settings.tutorTone);
  return <TutorFigure character={character} tone={tone} state={state} emotion={emotion} speech={speech} size={size} />;
}
