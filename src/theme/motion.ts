import { Easing, FadeIn, FadeInDown, SlideInDown, ZoomIn } from 'react-native-reanimated';

/**
 * One motion language for the whole app: things decelerate into place and accelerate away, with
 * no spring wobble. Celebrations may overshoot once, gently, and settle without bouncing.
 */
export const easing = {
  /** Entering and settling: fast start, long soft landing. */
  out: Easing.bezier(0.22, 1, 0.36, 1),
  /** Leaving: picks up speed and is gone. */
  in: Easing.bezier(0.4, 0, 1, 1),
  /** A single gentle overshoot, for rewards. */
  overshoot: Easing.bezier(0.34, 1.4, 0.64, 1),
} as const;

export const duration = {
  fast: 180,
  base: 260,
  sheetIn: 340,
  sheetOut: 220,
} as const;

/** Ready-made layout animations, so screens do not each tune their own springs. */
export const enter = {
  fade: () => FadeIn.duration(duration.base).easing(easing.out),
  rise: (delay = 0) => FadeInDown.delay(delay).duration(duration.base + 60).easing(easing.out),
  slideUp: () => SlideInDown.duration(duration.sheetIn).easing(easing.out),
  pop: () => ZoomIn.duration(duration.base).easing(easing.overshoot),
  celebrate: () => ZoomIn.duration(520).easing(easing.overshoot),
};
