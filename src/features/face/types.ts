import type { StyleProp, ViewStyle } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

/** What the tutor is doing right now. `happy` and `encouraging` are short reactions. */
export type FaceState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'happy' | 'encouraging';

/** Emotional colouring layered on top of the state (e.g. speaking while happy). */
export type FaceEmotion = 'neutral' | 'happy' | 'encouraging' | 'curious' | 'empathetic';

/**
 * Loudness of the tutor's voice, 0..1.
 * Prefer a Reanimated `SharedValue`: updating it never re-renders React, so it can be fed at
 * audio-frame rate. A plain number also works (it re-renders only when it changes).
 */
export type AudioLevel = number | SharedValue<number>;

export interface AIFaceProps {
  state: FaceState;
  emotion?: FaceEmotion;
  /** Omit to get a procedural talking motion while `state` is `speaking`. */
  audioLevel?: AudioLevel;
  /** Width in px; height is `size * FACE_ASPECT`. */
  size?: number;
  /** Feature colour. Defaults to the app's Telegram blue. */
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export const FACE_ASPECT = 0.72;
