import type { FaceEmotion, FaceState } from '@/features/face';
import type { AiMessage, VoiceState } from '@/types';

export function toFaceState(state: VoiceState): FaceState {
  return state;
}

const RULES: readonly [RegExp, FaceEmotion][] = [
  [/отлично|молодец|прекрасно|супер|great|excellent/i, 'encouraging'],
  [/ого|вау|неужели|ничего себе|wow|really\?/i, 'surprised'],
  [/шутк|хаха|ха-ха|😉|😜|😏/i, 'playful'],
  [/спасибо|пожалуйста|рад[аы]? /i, 'happy'],
  [/извин|простите|sorry/i, 'empathetic'],
  [/!/, 'happy'],
  [/\?/, 'curious'],
];

/**
 * The emotion reported by the backend, or a rough guess from the text for the scripted mock.
 */
export function pickEmotion(message: AiMessage | null): FaceEmotion {
  if (message?.emotion) return message.emotion;
  return RULES.find(([pattern]) => pattern.test(message?.text ?? ''))?.[1] ?? 'neutral';
}
