import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Times offered in settings: morning, lunch, after work, evening, late evening. */
export const REMINDER_TIMES = [
  { hour: 8, minute: 0 },
  { hour: 12, minute: 30 },
  { hour: 18, minute: 0 },
  { hour: 19, minute: 30 },
  { hour: 21, minute: 0 },
] as const;

export interface ReminderTime {
  hour: number;
  minute: number;
}

interface RemindersState {
  /** The learner's own switch; the system permission is checked separately. */
  enabled: boolean;
  time: ReminderTime;
  /** When the friendly "turn on reminders?" sheet was shown, so it is offered only once. */
  promptedAt: number | null;
  /**
   * Last time the learner actually practised (a talk, a word round, pronunciation…). Kept here
   * because the profile store is not saved on the device and is empty at a cold start.
   */
  lastActiveAt: number | null;
  setEnabled: (enabled: boolean) => void;
  setTime: (time: ReminderTime) => void;
  markPrompted: () => void;
  markActive: (at?: number) => void;
  reset: () => void;
}

const INITIAL = { enabled: true, time: { hour: 19, minute: 30 }, promptedAt: null, lastActiveAt: null } satisfies Partial<RemindersState>;

export const useRemindersStore = create<RemindersState>()(
  persist(
    (set) => ({
      ...INITIAL,
      setEnabled: (enabled) => set({ enabled }),
      setTime: (time) => set({ time: { hour: time.hour, minute: time.minute } }),
      markPrompted: () => set({ promptedAt: Date.now() }),
      markActive: (at = Date.now()) => set((state) => (state.lastActiveAt !== null && state.lastActiveAt >= at ? state : { lastActiveAt: at })),
      reset: () => set(INITIAL),
    }),
    { name: 'reminders', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export const formatTime = ({ hour, minute }: ReminderTime): string => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
