import type { Href } from 'expo-router';

import { KIND_STYLES } from '@/features/notifications/kinds';
import { isOutboxEmpty, useNotificationsStore, type NotificationsOutbox } from '@/features/notifications/notificationsStore';
import type { AppNotification, NotificationKind } from '@/features/notifications/types';
import { isApiConfigured } from '@/services/api/config';
import { endpoints, type ApiNotification, type ApiNotificationSelection } from '@/services/api/endpoints';
import { ApiError } from '@/services/api/http';
import { getToken } from '@/services/api/tokenStore';
import { useSettingsStore } from '@/store/settingsStore';

const FLUSH_DEBOUNCE_MS = 1_000;
/** The server takes at most this many ids per call. */
const MAX_IDS = 100;

/** The screens the server may point at, by name. Anything else is shown without a button. */
const ACTION_ROUTES: Record<string, Href> = {
  scenarios: '/scenarios',
  words: '/words',
  practice: '/practice',
  pronunciation: '/pronunciation',
  translate: '/translate',
};

const isKind = (kind: string): kind is NotificationKind => kind in KIND_STYLES;

function fromApi(item: ApiNotification): AppNotification[] {
  const createdAt = Date.parse(item.created_at);
  if (!Number.isFinite(createdAt)) return [];
  const href = item.action ? ACTION_ROUTES[item.action.target] : undefined;
  return [
    {
      id: item.id,
      kind: isKind(item.kind) ? item.kind : 'news',
      title: item.title,
      body: item.body,
      createdAt,
      read: item.read,
      action: href && item.action ? { href, label: item.action.label } : undefined,
      remote: true,
    },
  ];
}

/**
 * A request the server answered with a 4xx other than 401/408/429 will fail the same way again,
 * so its outbox entry is dropped rather than retried forever. Anything else is kept for later.
 */
const isPermanent = (error: unknown) =>
  error instanceof ApiError && error.status >= 400 && error.status < 500 && ![401, 408, 429].includes(error.status);

async function send(call: () => Promise<unknown>, done: Partial<NotificationsOutbox>): Promise<boolean> {
  try {
    await call();
  } catch (error) {
    if (!isPermanent(error)) return false;
  }
  useNotificationsStore.getState().settle(done);
  return true;
}

const iso = (time: number) => new Date(time).toISOString();
const ids = (list: string[]): ApiNotificationSelection => ({ ids: list.slice(0, MAX_IDS) });

let flushing: Promise<void> | null = null;

/** Sends the outbox, oldest kind of change first; stops at the first one the network refuses. */
function flushOutbox(): Promise<void> {
  flushing ??= (async () => {
    // Loops because one call takes at most MAX_IDS ids, and new changes may land while sending.
    for (let round = 0; round < 10; round += 1) {
      const outbox = useNotificationsStore.getState().outbox;
      if (isOutboxEmpty(outbox)) return;

      const { clearBefore, readAllBefore } = outbox;
      const removed = outbox.removed.slice(0, MAX_IDS);
      const read = outbox.read.slice(0, MAX_IDS);
      const ok =
        (clearBefore === null || (await send(() => endpoints.deleteNotifications({ all: true, before: iso(clearBefore) }), { clearBefore }))) &&
        (removed.length === 0 || (await send(() => endpoints.deleteNotifications(ids(removed)), { removed }))) &&
        (readAllBefore === null || (await send(() => endpoints.readNotifications({ all: true, before: iso(readAllBefore) }), { readAllBefore }))) &&
        (read.length === 0 || (await send(() => endpoints.readNotifications(ids(read)), { read })));
      if (!ok) return;
    }
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

let flushTimer: ReturnType<typeof setTimeout> | null = null;

/** Called on every outbox change; taps in quick succession go out as one request. */
export function scheduleNotificationsFlush(): void {
  if (!isApiConfigured) return;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushOutbox();
  }, FLUSH_DEBOUNCE_MS);
}

let syncing: Promise<void> | null = null;

/**
 * Sends pending changes, then loads the inbox in the current interface language. Never throws:
 * offline, the device keeps showing what it has. Concurrent calls share one run.
 */
export function syncNotifications(): Promise<void> {
  if (!isApiConfigured) return Promise.resolve();
  syncing ??= (async () => {
    try {
      if ((await getToken()) === null) return;
      await flushOutbox();
      const page = await endpoints.notifications(useSettingsStore.getState().language);
      useNotificationsStore.getState().receive(page.data.flatMap(fromApi));
    } catch (error) {
      if (__DEV__) console.warn('[notifications] sync failed', error);
    }
  })().finally(() => {
    syncing = null;
  });
  return syncing;
}
