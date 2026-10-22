import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import { memo, useEffect } from 'react';
import { View } from 'react-native';
import {
  Easing,
  cancelAnimation,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ThinkingDots } from '../AIMascot';
import { useFaceMotion } from '../useFaceMotion';
import { AVATAR_SKSL } from './shader';
import { AVATAR_ASPECT, AVATAR_WIDTH, GLOW, HEAD_POSE, type TutorAvatarProps } from './pose';

const effect = Skia.RuntimeEffect.Make(AVATAR_SKSL);
if (!effect) throw new Error('TutorAvatar: shader failed to compile');

/**
 * The tutor as a 3D emoji head, ray-traced per pixel in a Skia shader (see `shader.ts`).
 * State and emotion pick the expression; `speech` (from `useLipSync`) moves the lips, brows and head
 * with the line being spoken. Every value is a Reanimated shared value: React never re-renders per frame.
 *
 *   <TutorAvatar state="speaking" emotion="happy" speech={lipSync.face} size={200} />
 */
export const TutorAvatar = memo(function TutorAvatar({ state, emotion = 'neutral', speech, size = 200, style }: TutorAvatarProps) {
  const motion = useFaceMotion(state, emotion);
  const { breathe, sway, blink, gazeX, gazeY, eyeOpen, smileEyes, smile, mouthShift, mouth, mouthOpen, browLift, browTilt, browAsym, reaction, wink } =
    motion;

  const width = size * AVATAR_WIDTH;
  const height = width * AVATAR_ASPECT;
  const radius = size * 0.42;

  const float = useSharedValue(0);
  const glowPulse = useSharedValue(0);
  const glowLevel = useSharedValue(GLOW[state].level);
  const pop = useSharedValue(0);
  const headYaw = useSharedValue(0);
  const headPitch = useSharedValue(0);
  const headRoll = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [float]);

  const { level, period } = GLOW[state];
  useEffect(() => {
    glowLevel.value = withTiming(level, { duration: 400 });
    cancelAnimation(glowPulse);
    glowPulse.value = 0;
    glowPulse.value = withRepeat(withTiming(1, { duration: period, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [glowLevel, glowPulse, level, period]);

  useEffect(() => {
    const pose = HEAD_POSE[state];
    const spring = { damping: 14, stiffness: 70 };
    headYaw.value = withSpring(pose.yaw, spring);
    headPitch.value = withSpring(pose.pitch, spring);
    headRoll.value = withSpring(pose.roll, spring);
    if (state === 'happy' || state === 'encouraging' || state === 'surprised' || state === 'wink') {
      pop.value = withSequence(withTiming(1, { duration: 150, easing: Easing.out(Easing.cubic) }), withSpring(0, { damping: 6, stiffness: 150 }));
    }
  }, [state, headYaw, headPitch, headRoll, pop]);

  const uniforms = useDerivedValue(() => {
    const talking = speech ? speech.active.value : 0;
    const jaw = speech && talking > 0.01 ? speech.jaw.value * talking + mouth.value * (1 - talking) : mouth.value;
    const lipSpread = speech ? speech.spread.value * talking : 0;
    const lipRound = speech ? speech.round.value * talking : 0;
    const resting = 1 - talking;
    const restRound = Math.min(0.8, mouthOpen.value * 2) * resting;
    const smileNow = smile.value + (speech ? speech.smile.value : 0);
    const grin = Math.min(1, Math.max(0, (smileNow - 0.75) * 2.2)) * (1 - talking * 0.65);
    const energy = speech ? speech.energy.value : 0;

    const blinkNow = Math.max(blink.value, speech ? speech.blink.value : 0);
    const open = eyeOpen.value * (1 - blinkNow * 0.96) * (1 - Math.max(0, smileNow - 0.9) * 0.15);
    const smileL = Math.min(1, smileEyes.value + (speech ? speech.smile.value * 0.25 : 0));
    const smileR = Math.max(smileL, wink.value);

    const yaw = headYaw.value + (sway.value - 0.5) * 0.14 + gazeX.value * 0.09 + (speech ? speech.yaw.value : 0);
    const pitch = headPitch.value + (breathe.value - 0.5) * 0.05 + (speech ? speech.nod.value : 0) - reaction.value * 0.08;
    const roll = headRoll.value + (sway.value - 0.5) * 0.04 + (speech ? speech.roll.value : 0) - wink.value * 0.06;

    const hover = float.value;
    const lift = (hover - 0.5) * radius * 0.08 + pop.value * radius * 0.12;
    const stretch = pop.value * 0.05 + jaw * 0.018;
    const glow = glowLevel.value * (0.75 + glowPulse.value * 0.25) + energy * 0.25;

    return {
      res: [width, height],
      center: [width / 2, height / 2 - radius * 0.14 - lift],
      radius: radius * (1 + pop.value * 0.03),
      rot: [yaw, pitch, roll],
      squash: [1 - stretch * 0.6, 1 + stretch],
      eyeL: [Math.max(0.02, open), smileL],
      eyeR: [Math.max(0.02, open * (1 - wink.value)), smileR],
      gaze: [gazeX.value, -gazeY.value],
      brow: [
        browLift.value + reaction.value * 0.5 + (speech ? speech.brow.value : 0) + jaw * 0.18,
        browTilt.value + (speech ? speech.care.value : 0),
        browAsym.value,
        0.028 + Math.max(0, browLift.value) * 0.008,
      ],
      mouthA: [Math.max(jaw, 0), lipSpread + Math.max(0, smileNow - 0.3) * 0.25, Math.max(lipRound, restRound), smileNow],
      mouthB: [
        speech ? speech.teeth.value * talking : 0,
        speech ? speech.tongue.value * talking : 0,
        mouthShift.value,
        grin,
      ],
      mood: [0.25 + smileEyes.value * 0.45 + Math.max(0, smileNow - 0.5) * 0.3, glow, (state === 'listening' ? glowPulse.value * 0.35 : 0) + energy * 0.2, 0],
      hover: hover * 0.6 + pop.value * 0.4,
    };
  });

  return (
    <View style={[{ width, height }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Canvas style={{ width, height }}>
        <Fill>
          <Shader source={effect} uniforms={uniforms} />
        </Fill>
      </Canvas>
      {/* A zero-size anchor at the head's upper right; the dots position themselves around it. */}
      <View pointerEvents="none" style={{ position: 'absolute', top: height * 0.16, right: width * 0.22 }}>
        <ThinkingDots visible={state === 'thinking'} size={size} />
      </View>
    </View>
  );
});
