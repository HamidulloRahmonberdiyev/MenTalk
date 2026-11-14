import { AIFace, type FaceEmotion, type FaceState, type SpeechFace } from '@/features/face';
import type { TutorCharacter, TutorTone } from '@/types';

import { PillTutor } from './PillTutor';

interface TutorFigureProps {
  character: TutorCharacter;
  /** Conversation tone; the capsule face takes on its colour and temperament. */
  tone?: TutorTone;
  state: FaceState;
  emotion: FaceEmotion;
  /** Lip-sync of the line being spoken. */
  speech?: SpeechFace;
  /** Nominal size; each character scales it to look about the same on screen. */
  size: number;
}

/** Draws whichever tutor the learner picked, with the same face states for all of them. */
export function TutorFigure({ character, tone, state, emotion, speech, size }: TutorFigureProps) {
  switch (character) {
    case 'sobo':
      return <AIFace variant="rive" state={state} emotion={emotion} audioLevel={speech?.jaw} size={size} />;
    // The id stays 'bubble' (it is saved on the device and on the server); the figure is now the capsule face.
    case 'bubble':
      return <PillTutor tone={tone} state={state} emotion={emotion} audioLevel={speech?.jaw} size={size} />;
  }
}
