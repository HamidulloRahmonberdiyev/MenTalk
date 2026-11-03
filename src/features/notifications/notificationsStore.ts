import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { demoNotifications } from '@/mocks/notifications';
import { isApiConfigured } from '@/services/api/config';

import type { AppNotification } from './types';

const LIMIT = 100;

/**
 * What the learner did to server notifications that the server has not heard yet. Kept on disk,
 * so marking read or deleting offline still reaches the server later. The `…Before` times are
 * the newest notification the learner had seen, so one arriving meanwhile is not swept up too.
 */
export interface NotificationsOutbox {
  read: string[];
  removed: string[];
  readAllBefore: number | null;
  clearBefore: number | null;
}

const EMPTY_OUTBOX: NotificationsOutbox = { read: [], removed: [], readAllBefore: null, clearBefore: null };

export const isOutboxEmpty = (outbox: NotificationsOutbox): boolean =>
  outbox.read.length === 0 && outbox.removed.length === 0 && outbox.readAllBefore === null && outbox.clearBefore === null;

interface NotificationsState {
  items: AppNotification[];
  /** The demo set is added once, on the first launch, in local mode only. */
  seeded: boolean;
  outbox: NotificationsOutbox;
  add: (item: Omit<AppNotification, 'id' | 'createdAt' | 'read'> & Partial<Pick<AppNotification, 'id' | 'createdAt'>>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clear: () => void;
  seedDemo: () => void;
  /** Takes the server's list as the truth, with the learner's not-yet-sent changes laid over it. */
  receive: (remote: AppNotification[]) => void;
  /** Forgets outbox entries the server has now applied (or refused for good). */
  settle: (done: Partial<NotificationsOutbox>) => void;
  /** Sign-out: nothing of this person's inbox stays on the device. */
  reset: () => void;
}

const without = (list: string[], drop: readonly string[] = []) => (drop.length ? list.filter((id) => !drop.includes(id)) : list);

/** Newest server notification on the device; `null` when there is none to report. */
const newestRemote = (items: AppNotification[]): number | null =>
  items.reduce<number | null>((newest, item) => (item.remote && (newest === null || item.createdAt > newest) ? item.createdAt : newest), null);

const laterOf = (a: number | null, b: number | null) => (a === null ? b : b === null ? a : Math.max(a, b));

function applyOutbox(items: AppNotification[], outbox: NotificationsOutbox): AppNotification[] {
  return items
    .filter((item) => !outbox.removed.includes(item.id) && (outbox.clearBefore === null || item.createdAt > outbox.clearBefore))
    .map((item) =>
      !item.read && (outbox.read.includes(item.id) || (outbox.readAllBefore !== null && item.createdAt <= outbox.readAllBefore)) ? { ...item, read: true } : item,
    );
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      items: [],
      seeded: false,
      outbox: EMPTY_OUTBOX,
      add: (item) =>
        set((state) => {
          const createdAt = item.createdAt ?? Date.now();
          const next: AppNotification = { ...item, id: item.id ?? `${createdAt}-${Math.random().toString(36).slice(2, 8)}`, createdAt, read: false };
          return { items: [next, ...state.items.filter((other) => other.id !== next.id)].slice(0, LIMIT) };
        }),
      markRead: (id) =>
        set((state) => {
          const item = state.items.find((other) => other.id === id);
          if (!item || item.read) return state;
          return {
            items: state.items.map((other) => (other.id === id ? { ...other, read: true } : other)),
            outbox: item.remote ? { ...state.outbox, read: [...state.outbox.read, id] } : state.outbox,
          };
        }),
      markAllRead: () =>
        set((state) => {
          const before = newestRemote(state.items.filter((item) => !item.read));
          return {
            items: state.items.map((item) => (item.read ? item : { ...item, read: true })),
            outbox: before === null ? state.outbox : { ...state.outbox, readAllBefore: laterOf(state.outbox.readAllBefore, before) },
          };
        }),
      remove: (id) =>
        set((state) => {
          const item = state.items.find((other) => other.id === id);
          if (!item) return state;
          return {
            items: state.items.filter((other) => other.id !== id),
            outbox: item.remote ? { ...state.outbox, read: without(state.outbox.read, [id]), removed: [...state.outbox.removed, id] } : state.outbox,
          };
        }),
      clear: () =>
        set((state) => {
          const before = newestRemote(state.items);
          return {
            items: [],
            // Everything up to `before` goes, so the separate entries are no longer needed.
            outbox: before === null ? state.outbox : { read: [], removed: [], readAllBefore: null, clearBefore: laterOf(state.outbox.clearBefore, before) },
          };
        }),
      seedDemo: () => {
        // Signed-in builds show only what the server sends.
        if (isApiConfigured || get().seeded) return;
        set((state) => ({ seeded: true, items: [...state.items, ...demoNotifications(Date.now())] }));
      },
      receive: (remote) =>
        set((state) => {
          // Device-made ones stay; demo ones and the previous server copy are replaced.
          const local = state.items.filter((item) => !item.remote && !item.id.startsWith('demo-'));
          const items = applyOutbox([...remote, ...local], state.outbox).sort((a, b) => b.createdAt - a.createdAt);
          return { items: items.slice(0, LIMIT) };
        }),
      settle: (done) =>
        set((state) => ({
          outbox: {
            read: without(state.outbox.read, done.read),
            removed: without(state.outbox.removed, done.removed),
            // A newer "all" made while the request was out is kept for the next flush.
            readAllBefore: done.readAllBefore != null && state.outbox.readAllBefore === done.readAllBefore ? null : state.outbox.readAllBefore,
            clearBefore: done.clearBefore != null && state.outbox.clearBefore === done.clearBefore ? null : state.outbox.clearBefore,
          },
        })),
      reset: () => set({ items: [], outbox: EMPTY_OUTBOX, seeded: false }),
    }),
    {
      name: 'notifications',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      // Version 0 had no outbox.
      migrate: (persisted) => ({ ...(persisted as object), outbox: EMPTY_OUTBOX }) as NotificationsState,
    },
  ),
);

export const countUnread = (state: Pick<NotificationsState, 'items'>): number => state.items.reduce((sum, item) => sum + (item.read ? 0 : 1), 0);
