import type { FaceEmotion, FaceState } from '@/features/face';
import type { VoiceState } from '@/types';

export function toFaceState(state: VoiceState): FaceState {
  return state;
}

const RULES: readonly [RegExp, FaceEmotion][] = [
  [/отлично|молодец|прекрасно|супер|great|excellent/i, 'encouraging'],
  [/спасибо|пожалуйста|рад[аы]? /i, 'happy'],
  [/извин|простите|sorry/i, 'empathetic'],
  [/!/, 'happy'],
  [/\?/, 'curious'],
];

/**
 * Mock emotion detection from the message text. Replace with the emotion reported
 * by the AI backend once it provides one.
 */
export function pickEmotion(text?: string | null): FaceEmotion {
  return RULES.find(([pattern]) => pattern.test(text ?? ''))?.[1] ?? 'neutral';
}
