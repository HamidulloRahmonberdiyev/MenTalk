import { Fit, RiveView, useRiveFile, useRiveNumber, useRiveTrigger, useViewModelInstance } from '@rive-app/react-native';
import { memo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Easing, cancelAnimation, useAnimatedReaction, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { SOBO_HELLO_MS, SOBO_MAP, SOBO_MOUTH, SOBO_NUM_STATE } from './soboMap';
import { SOBO_ASPECT, type SoboFaceProps } from './types';

const SOBO_ARTBOARD = 'SOBO-Motion-V02';
const SOBO_STATE_MACHINE = 'State Machine';
const SOBO_VIEW_MODEL = 'ViewModel';
const SOBO_INSTANCE = 'Instance';

/**
 * The SOBO sprout mascot, driven through Rive data binding (`numState`, `trigState`, `mouthOpen`).
 * Takes the same props as `<AIFace />`; blinking, Shine and Sparkles run on their own inside the file.
 *
 *   <SoboFace state="speaking" audioLevel={level} onFailure={() => setFallback(true)} />
 *
 * Native only (Nitro module, needs a development build); `SoboFace.web.tsx` reports failure instead.
 */
export const SoboFace = memo(function SoboFace({
  state,
  emotion = 'neutral',
  audioLevel,
  size = 240,
  style,
  greet = true,
  onFailure,
}: SoboFaceProps) {
  // Bundled as an asset: needs 'riv' in metro.config.js assetExts. The lint rule only allow-lists image extensions.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { riveFile, error: fileError } = useRiveFile(require('../../../assets/rive/sobo.riv'));
  const { instance, error: instanceError } = useViewModelInstance(riveFile, {
    async: true,
    viewModelName: SOBO_VIEW_MODEL,
    instanceName: SOBO_INSTANCE,
  });
  const { setValue: setNumState, error: numStateError } = useRiveNumber('numState', instance);
  const { setValue: setMouthOpen, error: mouthError } = useRiveNumber('mouthOpen', instance);
  const { trigger: bump, error: bumpError } = useRiveTrigger('trigState', instance);

  const failure = fileError ?? instanceError ?? numStateError ?? mouthError ?? bumpError ?? null;
  useEffect(() => {
    if (failure) onFailure?.(failure);
  }, [failure, onFailure]);

  // Hello is a short wave at the start of the conversation, then SOBO follows `state`.
  const [greeting, setGreeting] = useState(greet);
  useEffect(() => {
    if (!greeting || !instance) return;
    const timer = setTimeout(() => setGreeting(false), SOBO_HELLO_MS);
    return () => clearTimeout(timer);
  }, [greeting, instance]);

  const numState = greeting && state === 'idle' ? SOBO_NUM_STATE.hello : SOBO_MAP.states[state].numState;
  useEffect(() => {
    if (instance) setNumState(numState);
  }, [instance, numState, setNumState]);

  useEffect(() => {
    if (instance && SOBO_MAP.states[state].bump) bump();
  }, [instance, state, bump]);
  useEffect(() => {
    if (instance && SOBO_MAP.emotionBump[emotion]) bump();
  }, [instance, emotion, bump]);

  // Mouth: SOBO's mouthOpen is binary (>= 1 open), so the level is gated on the UI thread with
  // hysteresis and a minimum hold, and JS only hears about actual open/close flips.
  const speaking = useSharedValue(0);
  const hasAudio = useSharedValue(0);
  const numericLevel = useSharedValue(0);
  const talkPhase = useSharedValue(0);
  const mouthOpen = useSharedValue(0);
  const lastFlip = useSharedValue(0);
  const levelSource = typeof audioLevel === 'object' ? audioLevel : numericLevel;

  useEffect(() => {
    if (typeof audioLevel === 'number') numericLevel.value = audioLevel;
    hasAudio.value = audioLevel === undefined ? 0 : 1;
  }, [audioLevel, numericLevel, hasAudio]);

  const synthetic = state === 'speaking' && audioLevel === undefined;
  useEffect(() => {
    speaking.value = state === 'speaking' ? 1 : 0;
  }, [state, speaking]);
  useEffect(() => {
    if (!synthetic) return;
    talkPhase.value = 0;
    talkPhase.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(talkPhase);
  }, [synthetic, talkPhase]);

  const pushMouth = (open: number) => setMouthOpen(open);

  // Flips that happened before the view model was ready are replayed once it is.
  useEffect(() => {
    if (instance) setMouthOpen(mouthOpen.value);
  }, [instance, mouthOpen, setMouthOpen]);

  useAnimatedReaction(
    () => {
      if (!speaking.value) return -1;
      if (hasAudio.value) return levelSource.value;
      // No audio supplied: syllable-like pulses with short pauses between "words".
      const t = talkPhase.value * Math.PI * 2;
      const word = Math.sin(t * 1.5) > -0.55 ? 1 : 0;
      return Math.abs(Math.sin(t * 6.5)) * (0.6 + 0.3 * Math.sin(t * 2)) * word;
    },
    (level) => {
      const open = mouthOpen.value === 1;
      let next = open ? 1 : 0;
      if (level < 0) next = 0;
      else if (!open && level > SOBO_MOUTH.OPEN) next = 1;
      else if (open && level < SOBO_MOUTH.CLOSE) next = 0;
      if (next === mouthOpen.value) return;

      const now = Date.now();
      // Leaving `speaking` closes the mouth at once; otherwise hold each pose a little to avoid flicker.
      if (level >= 0 && now - lastFlip.value < SOBO_MOUTH.HOLD_MS) return;
      mouthOpen.value = next;
      lastFlip.value = now;
      scheduleOnRN(pushMouth, next);
    },
  );

  return (
    <View style={[{ width: size, height: size * SOBO_ASPECT }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {riveFile && instance ? (
        <RiveView
          file={riveFile}
          artboardName={SOBO_ARTBOARD}
          stateMachineName={SOBO_STATE_MACHINE}
          dataBind={instance}
          autoPlay
          fit={Fit.Contain}
          style={StyleSheet.absoluteFill}
          onError={(error) => onFailure?.(new Error(error.message))}
        />
      ) : null}
    </View>
  );
});
