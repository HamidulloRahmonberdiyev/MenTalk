import type { VoiceState } from '@/types';

/** Picks the tutor's face from the turn state and, while speaking, from the tone of the message. */
export function pickEmoji(state: VoiceState, text?: string | null): string {
  switch (state) {
    case 'idle':
      return '☺️';
    case 'listening':
      return '🙂';
    case 'thinking':
      return '🤔';
    case 'speaking':
      return speakingEmoji(text ?? '');
  }
}

const RULES: readonly [RegExp, string][] = [
  [/спасибо|пожалуйста|рад[аы]? /i, '🥰'],
  [/отлично|молодец|прекрасно|супер|great|excellent/i, '🤩'],
  [/извин|простите|sorry/i, '😅'],
  [/!/, '😄'],
  [/\?/, '🧐'],
];

function speakingEmoji(text: string): string {
  return RULES.find(([pattern]) => pattern.test(text))?.[1] ?? '😊';
}
