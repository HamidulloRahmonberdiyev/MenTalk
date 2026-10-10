/**
 * Backend settings. Without EXPO_PUBLIC_API_URL the app keeps its offline stand-ins
 * (mock auth, direct Gemini or scripted chat), so development works with no server.
 * Android emulators reach the host machine at http://10.0.2.2:8000/api/v1.
 */
export const apiConfig = {
  baseUrl: (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, ''),
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
};

export const isApiConfigured = apiConfig.baseUrl.length > 0;
