/**
 * Links the system hands to the app. `govori://telegram-return` comes from the sign-in bot's
 * "back to MenTalk" button: it only needs to bring the app forward, where the sign-in screen
 * notices it is in front again and finishes. So it never navigates while the app is open
 * (a falsy result keeps the current screen); on a cold start it lands on the welcome screen,
 * which picks the waiting sign-in up again.
 */
const TELEGRAM_RETURN = /^(?:[a-z][a-z0-9+.-]*:\/\/)?\/?telegram-return(?:[/?#]|$)/i;

export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }): string | null {
  try {
    if (TELEGRAM_RETURN.test(path)) return initial ? '/' : null;
    return path;
  } catch {
    // Never throw here: it would crash the app before any screen is shown.
    return initial ? '/' : null;
  }
}
