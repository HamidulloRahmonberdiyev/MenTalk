import type { StyleProp, ViewStyle } from 'react-native';

import type { SpeechFace } from '../lipsync/useLipSync';
import type { FaceEmotion, FaceState } from '../types';

export interface TutorAvatarProps {
  state: FaceState;
  emotion?: FaceEmotion;
  /** Lips, brows and head motion of the line being spoken, from `useLipSync().face`. */
  speech?: SpeechFace;
  /** Nominal head size in px; the canvas adds room for the glow and the floor shadow. */
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** Canvas width relative to `size`, and height relative to width. */
export const AVATAR_WIDTH = 1.3;
export const AVATAR_ASPECT = 1;

/** Halo strength and breathing period per state; the glow is what makes the head feel awake. */
export const GLOW: Record<FaceState, { level: number; period: number }> = {
  idle: { level: 0.45, period: 2800 },
  listening: { level: 0.95, period: 1100 },
  thinking: { level: 0.6, period: 1500 },
  speaking: { level: 0.75, period: 900 },
  happy: { level: 0.85, period: 1400 },
  encouraging: { level: 0.8, period: 1400 },
  wink: { level: 0.75, period: 1400 },
  surprised: { level: 0.95, period: 1000 },
};

/** Where the head points per state, in radians: yaw turns right, pitch nods down, roll tilts left. */
export const HEAD_POSE: Record<FaceState, { yaw: number; pitch: number; roll: number }> = {
  idle: { yaw: 0, pitch: 0, roll: 0 },
  // Leaning in a little reads as attention.
  listening: { yaw: -0.04, pitch: 0.08, roll: 0.05 },
  // Looking up and away, head tilted: "let me think".
  thinking: { yaw: 0.26, pitch: -0.14, roll: -0.12 },
  speaking: { yaw: 0, pitch: 0, roll: 0 },
  happy: { yaw: 0, pitch: -0.08, roll: 0.04 },
  encouraging: { yaw: 0, pitch: 0.04, roll: 0.08 },
  wink: { yaw: -0.12, pitch: 0, roll: -0.05 },
  surprised: { yaw: 0, pitch: -0.1, roll: 0 },
};
