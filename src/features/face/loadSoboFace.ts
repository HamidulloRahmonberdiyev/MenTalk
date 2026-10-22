import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { ComponentType } from 'react';
import { Platform } from 'react-native';

import type { SoboFaceProps } from './types';

/**
 * The Rive runtime is a native (Nitro) module that Expo Go does not ship; importing it there throws at
 * startup and closes the app. So SoboFace is required behind a guard, once, and only in builds that
 * include it. Null on web, in Expo Go, or if the module fails to load; callers fall back to the SVG face.
 */
function loadSoboFace(): ComponentType<SoboFaceProps> | null {
  if (Platform.OS === 'web' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('./SoboFace') as typeof import('./SoboFace')).SoboFace;
  } catch (error) {
    if (__DEV__) console.warn('Rive runtime is unavailable, using the SVG face:', error);
    return null;
  }
}

export const NativeSoboFace = loadSoboFace();
