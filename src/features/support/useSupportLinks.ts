import { useEffect, useState } from 'react';

import { isApiConfigured } from '@/services/api/config';
import { endpoints } from '@/services/api/endpoints';

/** The official channel: shown straight away, offline and in demo mode too; the server may point elsewhere. */
export const TELEGRAM_CHANNEL_URL = 'https://t.me/mentalk_official';

/** Fetched once per app session: the admin changes it rarely, and the default still opens. */
let cached: string | undefined;
let pending: Promise<string> | null = null;

function load(): Promise<string> {
  pending ??= endpoints
    .supportLinks()
    .then(({ telegram_url }) => (cached = telegram_url || TELEGRAM_CHANNEL_URL))
    .catch(() => TELEGRAM_CHANNEL_URL)
    .finally(() => {
      pending = null;
    });
  return pending;
}

/** The Telegram channel link: the server's when it has one, else the official channel. */
export function useTelegramUrl(): string {
  const [url, setUrl] = useState(cached ?? TELEGRAM_CHANNEL_URL);

  useEffect(() => {
    if (!isApiConfigured || cached !== undefined) return;
    let alive = true;
    void load().then((value) => {
      if (alive) setUrl(value);
    });
    return () => {
      alive = false;
    };
  }, []);

  return url;
}
