import { memo } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors } from '@/theme';

import { FACE_ASPECT, type AIFaceProps } from './types';
import { useFaceMotion, type FaceMotion } from './useFaceMotion';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Geometry in a 200 x 144 viewBox.
const EYE_X = [64, 136] as const;
const EYE_Y = 56;
const EYE_HALF_WIDTH = 14;
const EYE_HALF_HEIGHT = 18;
const BROW_HALF_WIDTH = 15;
const MOUTH_Y = 108;
const KAPPA = 0.5523;
const MOUTH_INSIDE = '#0B4A6A';

/** Eye outline as four cubic curves; a negative `bottom` bends the lower edge up into a smiling crescent. */
function eyePath(cx: number, cy: number, top: number, bottom: number): string {
  'worklet';
  const w = EYE_HALF_WIDTH;
  const k = KAPPA;
  return (
    `M${cx - w} ${cy} ` +
    `C${cx - w} ${cy - k * top} ${cx - k * w} ${cy - top} ${cx} ${cy - top} ` +
    `C${cx + k * w} ${cy - top} ${cx + w} ${cy - k * top} ${cx + w} ${cy} ` +
    `C${cx + w} ${cy + k * bottom} ${cx + k * w} ${cy + bottom} ${cx} ${cy + bottom} ` +
    `C${cx - k * w} ${cy + bottom} ${cx - w} ${cy + k * bottom} ${cx - w} ${cy} Z`
  );
}

/** Only the right eye winks; it bends into the same smiling crescent as a happy eye. */
const smileOf = ({ smileEyes, wink }: FaceMotion, index: 0 | 1) => {
  'worklet';
  return index === 1 ? Math.max(smileEyes.value, wink.value) : smileEyes.value;
};

function useEyeProps(motion: FaceMotion, index: 0 | 1) {
  const { eyeOpen, blink, gazeX, gazeY } = motion;
  return useAnimatedProps(() => {
    const smileEyes = smileOf(motion, index);
    const open = Math.max(0.06, eyeOpen.value * (1 - blink.value * 0.94));
    const top = EYE_HALF_HEIGHT * open;
    const bottom = top * (1 - smileEyes * 1.65);
    return { d: eyePath(EYE_X[index] + gazeX.value * 7, EYE_Y + gazeY.value * 5 + smileEyes * 3, top, bottom) };
  });
}

/** Brow as a gentle arc above the eye. Left brow's inner end is on the right, and vice versa. */
function useBrowProps({ eyeOpen, blink, gazeX, browLift, browTilt, browAsym, mouth, reaction }: FaceMotion, index: 0 | 1) {
  return useAnimatedProps(() => {
    const dir = index === 0 ? 1 : -1; // towards the face centre
    const cx = EYE_X[index] + gazeX.value * 4;
    const lift = browLift.value + reaction.value * 0.5 + mouth.value * 0.12 + (index === 1 ? browAsym.value : 0);
    const y = EYE_Y - EYE_HALF_HEIGHT * eyeOpen.value - 11 - lift * 7 + blink.value * 2;
    const tilt = browTilt.value * 5;
    const outerY = y + tilt * 0.5;
    const innerY = y - tilt;
    const arch = 5 + browLift.value * 1.5 - Math.abs(browTilt.value) * 1.5;
    const w = BROW_HALF_WIDTH;
    const outerX = cx - dir * w;
    const innerX = cx + dir * w;
    return { d: `M${outerX} ${outerY} Q${cx} ${(outerY + innerY) / 2 - arch} ${innerX} ${innerY}` };
  });
}

function useGlintProps(motion: FaceMotion, index: 0 | 1) {
  const { eyeOpen, blink, gazeX, gazeY } = motion;
  return useAnimatedProps(() => {
    const smileEyes = smileOf(motion, index);
    const open = Math.max(0.06, eyeOpen.value * (1 - blink.value * 0.94));
    return {
      cx: EYE_X[index] + gazeX.value * 7 + 4.5,
      cy: EYE_Y + gazeY.value * 5 - 7 * open,
      opacity: Math.max(0, 1 - blink.value * 1.4 - smileEyes * 1.6),
    };
  });
}

/**
 * The tutor's face: two eyes, expressive brows and a mouth, drawn with SVG and driven entirely by Reanimated shared values.
 *
 *   <AIFace state="speaking" emotion="happy" audioLevel={level} />
 *
 * Pass `audioLevel` as a `SharedValue` to move the mouth with the voice without re-rendering React.
 */
export const AIFace = memo(function AIFace({
  state,
  emotion = 'neutral',
  audioLevel,
  size = 240,
  color = colors.primaryDark,
  style,
}: AIFaceProps) {
  const motion = useFaceMotion(state, emotion, audioLevel);
  const { breathe, sway, smile, mouthShift, mouth, reaction } = motion;
  const leftBrow = useBrowProps(motion, 0);
  const rightBrow = useBrowProps(motion, 1);

  const leftEye = useEyeProps(motion, 0);
  const rightEye = useEyeProps(motion, 1);
  const leftGlint = useGlintProps(motion, 0);
  const rightGlint = useGlintProps(motion, 1);

  const mouthProps = useAnimatedProps(() => {
    const s = smile.value;
    const o = mouth.value;
    const cx = 100 + mouthShift.value * 8;
    const halfWidth = 22 - o * 5 + s * 3;
    const corner = MOUTH_Y - s * 4 + o;
    const upper = corner + 4 + s * 16 - o * 3;
    const lower = upper + o * 34;
    const left = cx - halfWidth;
    const right = cx + halfWidth;
    return {
      d: `M${left} ${corner} Q${cx} ${upper} ${right} ${corner} Q${cx} ${lower} ${left} ${corner} Z`,
      fillOpacity: Math.min(1, o * 4),
    };
  });

  const floatStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (sway.value - 0.5) * 3 },
      { translateY: (breathe.value - 0.5) * 4 - reaction.value * 6 },
      { scale: 1 + reaction.value * 0.035 + mouth.value * 0.012 },
    ],
  }));

  return (
    <View style={[{ width: size, height: size * FACE_ASPECT }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[{ flex: 1 }, floatStyle]}>
        <Svg width="100%" height="100%" viewBox="0 0 200 144">
          <Defs>
            <LinearGradient id="eye" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.primaryLight} />
              <Stop offset="1" stopColor={color} />
            </LinearGradient>
          </Defs>

          {/* Soft halo, then the eyes themselves */}
          <AnimatedPath fill="none" stroke={color} strokeOpacity={0.14} strokeWidth={9} strokeLinejoin="round" animatedProps={leftEye} />
          <AnimatedPath fill="none" stroke={color} strokeOpacity={0.14} strokeWidth={9} strokeLinejoin="round" animatedProps={rightEye} />
          <AnimatedPath fill="url(#eye)" animatedProps={leftEye} />
          <AnimatedPath fill="url(#eye)" animatedProps={rightEye} />
          <AnimatedCircle r={4.2} fill="#FFFFFF" animatedProps={leftGlint} />
          <AnimatedCircle r={4.2} fill="#FFFFFF" animatedProps={rightGlint} />

          <AnimatedPath fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" animatedProps={leftBrow} />
          <AnimatedPath fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" animatedProps={rightBrow} />

          <AnimatedPath
            fill={MOUTH_INSIDE}
            stroke={color}
            strokeWidth={5}
            strokeLinejoin="round"
            strokeLinecap="round"
            animatedProps={mouthProps}
          />
        </Svg>
      </Animated.View>
    </View>
  );
});
