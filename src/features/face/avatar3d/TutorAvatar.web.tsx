import { memo } from 'react';

import { AIMascot } from '../AIMascot';
import { AVATAR_WIDTH, type TutorAvatarProps } from './pose';

/**
 * Web build: Skia needs CanvasKit (a separate WASM download) there, so the browser gets the flat SVG
 * mascot with the same API. Its mouth still follows the lip-sync jaw.
 */
export const TutorAvatar = memo(function TutorAvatar({ state, emotion, speech, size = 200, style }: TutorAvatarProps) {
  return <AIMascot state={state} emotion={emotion} audioLevel={speech?.jaw} size={(size * AVATAR_WIDTH) / 1.5} style={style} />;
});
