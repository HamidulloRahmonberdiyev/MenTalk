import { TurboModuleRegistry } from 'react-native';

import { apiConfig } from '@/services/api/config';

/** Where the Google ID token comes from. The server verifies it, so any source that yields one will do. */
export interface IdTokenProvider {
  getIdToken(): Promise<string>;
  signOut(): Promise<void>;
}

export class SignInCancelled extends Error {
  constructor() {
    super('Sign-in cancelled');
    this.name = 'SignInCancelled';
  }
}

/** The native Google module is missing from this build (Expo Go), or Google is not configured. */
export class GoogleUnavailable extends Error {
  constructor() {
    super('Google sign-in is unavailable in this build');
    this.name = 'GoogleUnavailable';
  }
}

type GoogleModule = typeof import('@react-native-google-signin/google-signin');

let configured = false;

/**
 * The native Google sign-in sheet. The module is loaded on first use, so the app still starts in
 * a build without the native code (Expo Go); only signing in reports `GoogleUnavailable`.
 */
async function google(): Promise<GoogleModule> {
  // Importing the package throws (and Metro logs it) when the binary lacks the native module, so look first.
  if (!apiConfig.googleWebClientId || !TurboModuleRegistry.get('RNGoogleSignin')) throw new GoogleUnavailable();
  const module = await import('@react-native-google-signin/google-signin');
  if (!configured) {
    module.GoogleSignin.configure({ webClientId: apiConfig.googleWebClientId, iosClientId: apiConfig.googleIosClientId || undefined });
    configured = true;
  }
  return module;
}

export class GoogleIdTokenProvider implements IdTokenProvider {
  async getIdToken(): Promise<string> {
    const { GoogleSignin, isSuccessResponse } = await google();
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) throw new SignInCancelled();
    if (!response.data.idToken) throw new Error('Google returned no ID token');
    return response.data.idToken;
  }

  async signOut(): Promise<void> {
    try {
      await (await google()).GoogleSignin.signOut();
    } catch {
      // Nothing to sign out of when Google is unavailable.
    }
  }
}
