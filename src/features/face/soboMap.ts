import type { FaceEmotion, FaceState } from './types';

/** `numState` values understood by the SOBO state machine. 5+ does nothing. */
export const SOBO_NUM_STATE = { idle: 0, hello: 1, listen: 2, yes: 3, talk: 4 } as const;

/**
 * How our tutor states and emotions drive the SOBO mascot, in one place so it is easy to extend.
 * SOBO has no emotion axis, thinking, wink or visemes, so several states share a pose and
 * emotions can only add a one-off Bump (`trigState`).
 */
export const SOBO_MAP: {
  states: Record<FaceState, { numState: number; bump: boolean }>;
  emotionBump: Record<FaceEmotion, boolean>;
} = {
  states: {
    idle: { numState: SOBO_NUM_STATE.idle, bump: false },
    listening: { numState: SOBO_NUM_STATE.listen, bump: false },
    thinking: { numState: SOBO_NUM_STATE.listen, bump: false },
    speaking: { numState: SOBO_NUM_STATE.talk, bump: false },
    happy: { numState: SOBO_NUM_STATE.yes, bump: true },
    encouraging: { numState: SOBO_NUM_STATE.yes, bump: false },
    wink: { numState: SOBO_NUM_STATE.idle, bump: false },
    surprised: { numState: SOBO_NUM_STATE.idle, bump: true },
  },
  emotionBump: {
    neutral: false,
    happy: true,
    encouraging: false,
    curious: false,
    empathetic: false,
    surprised: true,
    playful: false,
  },
};

/** How long the Hello wave plays when the mascot first appears. */
export const SOBO_HELLO_MS = 1800;

/** Mouth gate: open above OPEN, close below CLOSE, never flip faster than HOLD_MS. */
export const SOBO_MOUTH = { OPEN: 0.18, CLOSE: 0.08, HOLD_MS: 100 } as const;
