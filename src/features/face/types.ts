import type { StyleProp, ViewStyle } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import type { TutorEmotion } from '@/types';

/** What the tutor is doing right now. `happy`, `encouraging`, `wink` and `surprised` are short reactions. */
export type FaceState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'happy' | 'encouraging' | 'wink' | 'surprised';

/** Emotional colouring layered on top of the state (e.g. speaking while happy). */
export type FaceEmotion = TutorEmotion;

/**
 * Lasting temperament under every state and emotion (the conversation tone). `angry` keeps the brows
 * knitted and the mouth turned down even while speaking; `funny` keeps a wide grin.
 */
export type FaceMood = 'calm' | 'funny' | 'angry';

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
  /** Inside of the open mouth. Defaults to a deep blue that matches the default features. */
  mouthColor?: string;
  /** Top of the eye gradient. Defaults to the app's light blue. */
  eyeLight?: string;
  /** Cheek colour; omit for no cheeks. */
  blush?: string;
  /** Defaults to `calm`. */
  mood?: FaceMood;
  style?: StyleProp<ViewStyle>;
}

export const FACE_ASPECT = 0.72;

/** `svg` is the hand-drawn face; `rive` is the SOBO mascot (native only, falls back to `svg`). */
export type FaceVariant = 'svg' | 'rive';

export interface SoboFaceProps extends AIFaceProps {
  /** Wave Hello for a moment when the mascot first appears. Defaults to true. */
  greet?: boolean;
  /** Called when the Rive file, its view model or the view fails, so the caller can fall back. */
  onFailure?: (error: Error) => void;
}

/** SOBO is drawn in a square box (full body, `Fit.Contain`). */
export const SOBO_ASPECT = 1;
