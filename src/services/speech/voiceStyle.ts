import type { TutorEmotion, TutorTone } from '@/types';

/** How a tutor line should sound: a delivery note for Gemini speech, pitch and speed for the device voice. */
export interface VoiceStyle {
  /** Goes to the TTS model as a style note, never into the spoken text (it would be read aloud). */
  style: string;
  /** Device voice pitch, 1 = normal. */
  pitch: number;
  /** Device voice speed, 1 = normal. */
  rate: number;
}

/** The tone the learner picked sets the character of the voice for the whole chat. */
const TONES: Record<TutorTone, VoiceStyle> = {
  calm: { style: 'calm, warm and patient, unhurried, soft and reassuring', pitch: 1, rate: 0.92 },
  funny: { style: 'playful and upbeat, a smile in the voice, lively and bouncy', pitch: 1.12, rate: 1.02 },
  angry: { style: 'angry, irritated and stern, clipped forceful delivery, sharp emphasis', pitch: 0.86, rate: 1.06 },
};

/**
 * Each line's emotion colours that voice without replacing it, so an angry tutor who is pleased
 * still sounds gruff. Phrased per tone where the plain word would contradict it.
 */
const EMOTIONS: Record<TutorEmotion, { note: string | Partial<Record<TutorTone, string>>; pitch: number; rate: number }> = {
  neutral: { note: '', pitch: 0, rate: 0 },
  happy: { note: { calm: 'quietly pleased', funny: 'delighted, almost laughing', angry: 'grudgingly satisfied' }, pitch: 0.04, rate: 0.02 },
  encouraging: { note: { calm: 'gently encouraging', funny: 'cheering the learner on', angry: 'demanding, pushing the learner to do better' }, pitch: 0.02, rate: 0 },
  curious: { note: { calm: 'genuinely curious', funny: 'curious and teasing', angry: 'suspicious and probing' }, pitch: 0.03, rate: -0.02 },
  empathetic: { note: { calm: 'tender and understanding', funny: 'kind and reassuring', angry: 'softening a little, still gruff' }, pitch: -0.02, rate: -0.05 },
  surprised: { note: { calm: 'pleasantly surprised', funny: 'astonished, exaggerated', angry: 'shocked and indignant' }, pitch: 0.06, rate: 0.03 },
  playful: { note: { calm: 'lightly playful', funny: 'mischievous and joking', angry: 'sarcastic' }, pitch: 0.04, rate: 0.02 },
};

export function voiceStyleFor(tone: TutorTone, emotion: TutorEmotion = 'neutral'): VoiceStyle {
  const base = TONES[tone];
  const shade = EMOTIONS[emotion] ?? EMOTIONS.neutral;
  const note = typeof shade.note === 'string' ? shade.note : (shade.note[tone] ?? '');
  return {
    style: note ? `${base.style}; right now ${note}` : base.style,
    pitch: Math.round((base.pitch + shade.pitch) * 100) / 100,
    rate: Math.round((base.rate + shade.rate) * 100) / 100,
  };
}
