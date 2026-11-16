import type { TelegramAttempt, TelegramPhase } from './TelegramLogin';

export interface AuthUser {
  name: string;
  /** Null for an account made with Telegram. */
  email: string | null;
}

export interface TelegramProgress {
  phase: TelegramPhase;
  attempt: TelegramAttempt;
}

export interface TelegramSignInOptions {
  signal: AbortSignal;
  /** Called once the bot link exists (to show the waiting screen), and on every change after. */
  onProgress: (progress: TelegramProgress) => void;
}

export interface AuthService {
  signInWithGoogle(): Promise<AuthUser>;
  /** Opens the sign-in bot in Telegram and resolves once the person confirms there. */
  signInWithTelegram(options: TelegramSignInOptions): Promise<AuthUser>;
  /** Carries on with a Telegram sign-in an earlier launch left waiting; null when there is none. */
  resumeTelegramSignIn(options: TelegramSignInOptions): Promise<AuthUser | null>;
  /** The person from a previous launch, or null when nobody is signed in. */
  restore(): Promise<AuthUser | null>;
  signOut(): Promise<void>;
}
