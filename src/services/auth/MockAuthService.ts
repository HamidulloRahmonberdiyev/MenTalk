import type { AuthService, AuthUser, TelegramSignInOptions } from './AuthService';
import { SignInCancelled } from './GoogleIdTokenProvider';

const MOCK_USER: AuthUser = { name: 'Hamidullo', email: 'hamidullo0760@gmail.com' };

/** Local mode: no server, so every sign-in succeeds after a short, realistic pause. */
export class MockAuthService implements AuthService {
  async signInWithGoogle(): Promise<AuthUser> {
    await pause(700);
    return MOCK_USER;
  }

  async signInWithTelegram({ signal, onProgress }: TelegramSignInOptions): Promise<AuthUser> {
    const attempt = {
      id: 'mock',
      secret: 'mock',
      botUsername: 'mentalk_auth_bot',
      appUrl: 'https://t.me/mentalk_auth_bot',
      botUrl: 'https://t.me/mentalk_auth_bot',
      expiresAt: Date.now() + 5 * 60_000,
      pollMs: 2_000,
    };
    onProgress({ phase: 'waiting', attempt });
    await pause(1_200, signal);
    onProgress({ phase: 'opened', attempt });
    await pause(1_800, signal);
    return { name: MOCK_USER.name, email: null };
  }

  async resumeTelegramSignIn(): Promise<AuthUser | null> {
    return null;
  }

  async restore(): Promise<AuthUser | null> {
    return null;
  }

  async signOut(): Promise<void> {}
}

function pause(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new SignInCancelled());
    });
  });
}
