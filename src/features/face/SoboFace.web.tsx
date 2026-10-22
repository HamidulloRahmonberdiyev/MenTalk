import { memo, useEffect } from 'react';

import type { SoboFaceProps } from './types';

/**
 * Web stub: `@rive-app/react-native` is a Nitro (native-only) module with no web renderer, so on web
 * SOBO reports a failure right away and `<AIFace variant="rive" />` falls back to the SVG face.
 */
export const SoboFace = memo(function SoboFace({ onFailure }: SoboFaceProps) {
  useEffect(() => {
    onFailure?.(new Error('Rive mascot is not available on web'));
  }, [onFailure]);
  return null;
});
