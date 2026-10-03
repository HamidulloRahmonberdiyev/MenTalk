import { useEffect } from 'react';
import { useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';

/**
 * Fake voice loudness (0..1) with word-like bursts and pauses, for testing without audio.
 * Replace with the real playback level from Gemini Live; the `<AIFace />` API stays the same.
 */
export function useMockAudioLevel(active: boolean): SharedValue<number> {
  const level = useSharedValue(0);
  const time = useSharedValue(0);
  const enabled = useSharedValue(active);

  useEffect(() => {
    enabled.value = active;
  }, [active, enabled]);

  useFrameCallback((frame) => {
    if (!enabled.value) {
      level.value = 0;
      return;
    }
    time.value += (frame.timeSincePreviousFrame ?? 16) / 1000;
    const t = time.value;
    const wordGate = Math.sin(t * 2.1 + Math.sin(t * 0.7)) > -0.35 ? 1 : 0.05;
    const syllables = Math.abs(Math.sin(t * 9.2)) * 0.55 + Math.abs(Math.sin(t * 5.1 + 1)) * 0.35;
    level.value = Math.min(1, (syllables + 0.05) * wordGate);
  });

  return level;
}
