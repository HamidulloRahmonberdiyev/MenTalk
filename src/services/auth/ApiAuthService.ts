import { endpoints, type ApiUser } from '@/services/api/endpoints';
import { clearToken, getToken, setToken } from '@/services/api/tokenStore';
import { hydrateFromServer } from '@/services/session/profileSync';
import { useSettingsStore } from '@/store/settingsStore';

import type { AuthService, AuthUser, TelegramSignInOptions } from './AuthService';
import { deviceLabel } from './deviceLabel';
import type { IdTokenProvider } from './GoogleIdTokenProvider';
import { forgetTelegramAttempt, openTelegram, pendingTelegramAttempt, startTelegramAttempt, waitForTelegram, type TelegramAttempt } from './TelegramLogin';

/** Signs in through the MenTalk server, which hands out its own session token for a Google or Telegram identity. */
export class ApiAuthService implements AuthService {
  constructor(private readonly idTokens: IdTokenProvider) {}

  async signInWithGoogle(): Promise<AuthUser> {
    const { token, user } = await endpoints.signInWithGoogle(await this.idTokens.getIdToken(), deviceLabel(60), useSettingsStore.getState().language);
    return this.begin(token, user);
  }

  async signInWithTelegram(options: TelegramSignInOptions): Promise<AuthUser> {
    const attempt = await startTelegramAttempt(deviceLabel(), useSettingsStore.getState().language);
    options.onProgress({ phase: 'waiting', attempt });
    await openTelegram(attempt).catch(() => undefined);
    return this.finishTelegram(attempt, options);
  }

  async resumeTelegramSignIn(options: TelegramSignInOptions): Promise<AuthUser | null> {
    const attempt = await pendingTelegramAttempt();
    if (!attempt) return null;
    options.onProgress({ phase: 'waiting', attempt });
    return this.finishTelegram(attempt, options);
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
    await forgetTelegramAttempt();
    await this.idTokens.signOut();
  }

  private async finishTelegram(attempt: TelegramAttempt, { signal, onProgress }: TelegramSignInOptions): Promise<AuthUser> {
    try {
      const { token, user } = await waitForTelegram(attempt, { signal, onPhase: (phase) => onProgress({ phase, attempt }) });
      return await this.begin(token, user);
    } finally {
      // Whatever the outcome, this attempt is spent: never resume it on a later launch.
      await forgetTelegramAttempt();
    }
  }

  private async begin(token: string, user: ApiUser): Promise<AuthUser> {
    await setToken(token);
    await hydrateFromServer(user);
    return { name: user.name, email: user.email };
  }
}
