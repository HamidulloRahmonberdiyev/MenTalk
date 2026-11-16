import * as SecureStore from 'expo-secure-store';
import { AppState, Linking, Platform } from 'react-native';

import { endpoints, type ApiUser } from '@/services/api/endpoints';
import { ApiError, NetworkError } from '@/services/api/http';

import { SignInCancelled } from './GoogleIdTokenProvider';

/**
 * Sign-in through the @mentalk_auth_bot Telegram bot:
 * 1. the server opens an attempt and returns a deep link into the bot plus a secret;
 * 2. the person taps "Start" and then "Confirm" in Telegram;
 * 3. the app, polling with the secret, receives its session token once.
 * The attempt is kept in secure storage, so a phone that kills the app while Telegram is in front
 * can pick it up again on the next launch.
 */
export interface TelegramAttempt {
  id: string;
  secret: string;
  botUsername: string;
  appUrl: string;
  botUrl: string;
  /** Epoch ms. */
  expiresAt: number;
  pollMs: number;
}

/** `waiting`: nothing heard from Telegram yet. `opened`: the bot is showing the confirmation. */
export type TelegramPhase = 'waiting' | 'opened';

export class TelegramDeclined extends Error {
  constructor() {
    super('Sign-in was declined in Telegram');
    this.name = 'TelegramDeclined';
  }
}

export class TelegramExpired extends Error {
  constructor() {
    super('The Telegram sign-in request expired');
    this.name = 'TelegramExpired';
  }
}

const STORE_KEY = 'mentalk.telegram-login';
/** Confirming in Telegram extends the server's window; past this margin the attempt is surely gone. */
const GIVE_UP_AFTER_EXPIRY_MS = 2 * 60_000;
const OFFLINE_RETRY_MS = 3_000;

export async function startTelegramAttempt(device: string, language: 'uz' | 'ru' | 'en'): Promise<TelegramAttempt> {
  const login = await endpoints.startTelegramLogin(device, language);
  const attempt: TelegramAttempt = {
    id: login.id,
    secret: login.secret,
    botUsername: login.bot_username,
    appUrl: login.app_url,
    botUrl: login.bot_url,
    expiresAt: Date.parse(login.expires_at),
    pollMs: Math.max(1_000, login.poll_interval_ms),
  };
  await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(attempt)).catch(() => undefined);
  return attempt;
}

/** The attempt a previous launch left waiting, if it can still succeed. */
export async function pendingTelegramAttempt(): Promise<TelegramAttempt | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORE_KEY);
    if (!raw) return null;
    const attempt = JSON.parse(raw) as Partial<TelegramAttempt>;
    const valid =
      typeof attempt.id === 'string' &&
      typeof attempt.secret === 'string' &&
      typeof attempt.appUrl === 'string' &&
      typeof attempt.botUrl === 'string' &&
      typeof attempt.expiresAt === 'number' &&
      Date.now() < attempt.expiresAt + GIVE_UP_AFTER_EXPIRY_MS;
    if (!valid) {
      await forgetTelegramAttempt();
      return null;
    }
    return { botUsername: '', pollMs: 2_000, ...attempt } as TelegramAttempt;
  } catch {
    return null;
  }
}

export async function forgetTelegramAttempt(): Promise<void> {
  await SecureStore.deleteItemAsync(STORE_KEY).catch(() => undefined);
}

/** The Telegram app when it is installed; otherwise t.me in the browser, which offers to install it. */
export async function openTelegram(attempt: TelegramAttempt): Promise<void> {
  if (Platform.OS === 'web') {
    await Linking.openURL(attempt.botUrl);
    return;
  }
  try {
    await Linking.openURL(attempt.appUrl);
  } catch {
    await Linking.openURL(attempt.botUrl);
  }
}

/**
 * Polls until the person confirms in Telegram, and returns the session. Throws `TelegramDeclined`,
 * `TelegramExpired`, `SignInCancelled` (aborted), or the server's error (a blocked account: 403).
 */
export async function waitForTelegram(
  attempt: TelegramAttempt,
  { signal, onPhase }: { signal: AbortSignal; onPhase: (phase: TelegramPhase) => void },
): Promise<{ token: string; user: ApiUser }> {
  for (;;) {
    if (signal.aborted) throw new SignInCancelled();
    if (Date.now() > attempt.expiresAt + GIVE_UP_AFTER_EXPIRY_MS) throw new TelegramExpired();

    let pause = attempt.pollMs;
    try {
      const result = await endpoints.checkTelegramLogin(attempt.id, attempt.secret, signal);
      if (result.status === 'approved') return { token: result.token, user: result.user };
      if (result.status === 'declined') throw new TelegramDeclined();
      if (result.status === 'expired') throw new TelegramExpired();
      onPhase(result.status === 'opened' ? 'opened' : 'waiting');
    } catch (error) {
      if (signal.aborted) throw new SignInCancelled();
      if (error instanceof TelegramDeclined || error instanceof TelegramExpired) throw error;
      // The server forgets attempts after a day, and never admits one to a wrong secret.
      if (error instanceof ApiError && error.status === 404) throw new TelegramExpired();
      if (error instanceof ApiError && error.status === 429) pause = (error.retryAfterSec ?? 5) * 1_000;
      // Offline for a moment, or the server hiccuped: keep waiting, the attempt is still alive.
      else if (error instanceof NetworkError || (error instanceof ApiError && error.status >= 500)) pause = Math.max(pause, OFFLINE_RETRY_MS);
      else throw error;
    }
    await nextCheck(pause, signal);
  }
}

/**
 * Waits `ms` while the app is in front. In the background it holds off entirely, and the moment the
 * person comes back from Telegram it checks at once instead of finishing the wait.
 */
function nextCheck(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const finish = () => {
      if (timer) clearTimeout(timer);
      subscription.remove();
      signal.removeEventListener('abort', finish);
      resolve();
    };
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') finish();
      else if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    });
    signal.addEventListener('abort', finish);
    if (AppState.currentState !== 'background' && AppState.currentState !== 'inactive') timer = setTimeout(finish, ms);
  });
}
