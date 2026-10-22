/**
 * Backend settings. The server (and Google sign-in through it) is used only when
 * EXPO_PUBLIC_AUTH=prod and EXPO_PUBLIC_API_URL are both set. Otherwise the app runs in local mode:
 * no sign-in, and the offline stand-ins (direct Gemini or scripted chat), so testing needs no account.
 * Android emulators reach the host machine at http://10.0.2.2:8000/api/v1.
 */
export const apiConfig = {
  baseUrl: (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, ''),
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
};

/** `prod`: sign in with Google through the MenTalk server. `local` (default): straight in, no account. */
export const authMode: 'prod' | 'local' = process.env.EXPO_PUBLIC_AUTH === 'prod' ? 'prod' : 'local';

export const isApiConfigured = authMode === 'prod' && apiConfig.baseUrl.length > 0;
