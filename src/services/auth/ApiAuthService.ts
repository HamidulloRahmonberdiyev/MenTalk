import { Platform } from 'react-native';

import { endpoints } from '@/services/api/endpoints';
import { clearToken, getToken, setToken } from '@/services/api/tokenStore';
import { hydrateFromServer } from '@/services/session/profileSync';

import type { AuthService, AuthUser } from './AuthService';
import type { IdTokenProvider } from './GoogleIdTokenProvider';

/** Signs in through the MenTalk server: a Google ID token is exchanged for the server's own session token. */
export class ApiAuthService implements AuthService {
  constructor(private readonly idTokens: IdTokenProvider) {}

  async signInWithGoogle(): Promise<AuthUser> {
    const { token, user } = await endpoints.signInWithGoogle(await this.idTokens.getIdToken(), `${Platform.OS} ${Platform.Version}`);
    await setToken(token);
    await hydrateFromServer(user);
    return { name: user.name, email: user.email };
  }

  async restore(): Promise<AuthUser | null> {
    if (!(await getToken())) return null;
    try {
      const user = await endpoints.me();
      await hydrateFromServer(user);
      return { name: user.name, email: user.email };
    } catch {
      return null;
    }
  }

  async signOut(): Promise<void> {
    await endpoints.signOut().catch(() => undefined);
    await clearToken();
    await this.idTokens.signOut();
  }
}
