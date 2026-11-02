import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { demoNotifications } from '@/mocks/notifications';

import type { AppNotification } from './types';

const LIMIT = 100;

interface NotificationsState {
  items: AppNotification[];
  /** The demo set is added once, on the first launch, until the server sends real ones. */
  seeded: boolean;
  add: (item: Omit<AppNotification, 'id' | 'createdAt' | 'read'> & Partial<Pick<AppNotification, 'id' | 'createdAt'>>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clear: () => void;
  seedDemo: () => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      items: [],
      seeded: false,
      add: (item) =>
        set((state) => {
          const createdAt = item.createdAt ?? Date.now();
          const next: AppNotification = { ...item, id: item.id ?? `${createdAt}-${Math.random().toString(36).slice(2, 8)}`, createdAt, read: false };
          return { items: [next, ...state.items.filter((other) => other.id !== next.id)].slice(0, LIMIT) };
        }),
      markRead: (id) => set((state) => ({ items: state.items.map((item) => (item.id === id && !item.read ? { ...item, read: true } : item)) })),
      markAllRead: () => set((state) => ({ items: state.items.map((item) => (item.read ? item : { ...item, read: true })) })),
      remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
      clear: () => set({ items: [] }),
      seedDemo: () => {
        if (get().seeded) return;
        set((state) => ({ seeded: true, items: [...state.items, ...demoNotifications(Date.now())] }));
      },
    }),
    { name: 'notifications', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export const countUnread = (state: Pick<NotificationsState, 'items'>): number => state.items.reduce((sum, item) => sum + (item.read ? 0 : 1), 0);
