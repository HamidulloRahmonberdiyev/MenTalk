import type { Href } from 'expo-router';

import type { Language } from '@/i18n';

import { FRIEND, REMINDER_COPY, type ReminderCategory } from './copy';
import type { ReminderTime } from './remindersStore';

/**
 * Which days after the last plan a reminder goes out. Daily for the first week, then spaced out
 * and finally silent: a learner who has not come back in a month is not nagged any further.
 * Every time the learner practises, the plan is redrawn from that day.
 */
const DAY_OFFSETS = [0, 1, 2, 3, 4, 5, 6, 7, 10, 14, 21, 30] as const;
/** From this many days of silence on, the tone switches to "we miss you". */
const COMEBACK_AFTER_DAYS = 8;
/** Below this, due words are not worth a reminder of their own. */
const MIN_DUE_WORDS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Reminders closer than this to "now" are skipped rather than fired immediately. */
const MIN_LEAD_MS = 60_000;

export interface PlannerInput {
  now: number;
  time: ReminderTime;
  language: Language;
  name: string;
  tutor: string;
  /** Last practice of any kind; null if the learner has never practised. */
  lastActiveAt: number | null;
  /** Current streak as shown in the app (0 when broken). */
  streak: number;
  /** When each saved word of the studied language next falls due. */
  dueTimes: readonly number[];
  /** Topic titles in the interface language, the last one practised first if known. */
  topics: readonly { id: string; title: string }[];
}

export interface PlannedReminder {
  /** Stable per day, so redrawing the plan replaces rather than duplicates. */
  id: string;
  at: number;
  category: ReminderCategory;
  title: string;
  body: string;
  url: Href;
}

const ROUTES: Record<ReminderCategory, Href> = {
  firstSteps: '/scenarios',
  streakRisk: '/practice',
  streakKeep: '/scenarios',
  wordsDue: '/practice',
  talk: '/scenarios',
  topic: '/scenarios',
  game: '/practice',
  pronunciation: '/pronunciation',
  translate: '/translate',
  tip: '/scenarios',
  comeback: '/home',
};

/** The mix for an ordinary day; ineligible ones (no words yet…) are skipped. */
const ROTATION: readonly ReminderCategory[] = ['talk', 'wordsDue', 'topic', 'game', 'pronunciation', 'talk', 'translate', 'tip'];

const startOfDay = (time: number) => new Date(time).setHours(0, 0, 0, 0);

function at(dayStart: number, offset: number, { hour, minute }: ReminderTime): number {
  const date = new Date(dayStart);
  // setDate, not + offset * DAY_MS: a daylight-saving change would shift the hour.
  date.setDate(date.getDate() + offset);
  date.setHours(hour, minute, 0, 0);
  return date.getTime();
}

/** Small, stable hash: the same day always gets the same pick, a different day a different one. */
function hash(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return value >>> 0;
}

/** Fills placeholders; a sentence that now starts with a lower-case stand-in ("friend, …") is capitalised. */
function fill(template: string, values: Record<string, string | number>): string {
  const text = template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? '')).trim();
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

export function planReminders(input: PlannerInput): PlannedReminder[] {
  const { now, time, language, lastActiveAt, streak, dueTimes, topics } = input;
  const today = startOfDay(now);
  const practisedToday = lastActiveAt !== null && lastActiveAt >= today;
  const name = input.name.trim().split(/\s+/)[0] || FRIEND[language];
  const plan: PlannedReminder[] = [];
  let comebackStep = 0;
  let previous: ReminderCategory | null = null;
  /** Texts already used in this plan, so no sentence comes twice in a row of days. */
  const used = new Set<string>();

  const variantOf = (category: ReminderCategory, seed: number, count: number): number => {
    for (let step = 0; step < count; step += 1) {
      const variant = (seed + step) % count;
      if (!used.has(`${category}:${variant}`)) return variant;
    }
    return seed % count;
  };
  const push = (id: string, fireAt: number, category: ReminderCategory, variant: number, values: Record<string, string | number>) => {
    used.add(`${category}:${variant}`);
    plan.push(build(id, fireAt, category, variant, values, language));
    previous = category;
  };

  for (const offset of DAY_OFFSETS) {
    const fireAt = at(today, offset, time);
    if (fireAt < now + MIN_LEAD_MS) continue;
    if (offset === 0 && practisedToday) continue;

    const dayKey = new Date(fireAt).toDateString();
    const due = dueTimes.reduce((count, dueAt) => count + (dueAt <= fireAt ? 1 : 0), 0);
    const idleDays = lastActiveAt === null ? offset : Math.floor((fireAt - lastActiveAt) / DAY_MS);

    let category: ReminderCategory;
    const values: Record<string, string | number> = { name, tutor: input.tutor };

    if (lastActiveAt === null && offset <= 2) {
      category = 'firstSteps';
    } else if (offset === 0 && streak > 0) {
      category = 'streakRisk';
      values.n = streak;
    } else if (offset === 1 && practisedToday && streak > 0) {
      // Tomorrow the streak is alive but not yet extended: congratulate and invite.
      category = 'streakKeep';
      values.n = streak;
    } else if (idleDays >= COMEBACK_AFTER_DAYS || offset >= 10) {
      const variants = REMINDER_COPY[language].comeback;
      // The last planned one is the polite goodbye; the others go through the rest in order.
      const isLast = offset === DAY_OFFSETS[DAY_OFFSETS.length - 1];
      push(`reminder-${dayKey}`, fireAt, 'comeback', isLast ? variants.length - 1 : comebackStep++ % (variants.length - 1), values);
      continue;
    } else {
      category = pickRotation(hash(dayKey), previous, { due, hasWords: dueTimes.length > 0, hasTopics: topics.length > 0 });
    }

    if (category === 'wordsDue') values.n = due;
    if (category === 'topic') {
      // A different topic each time it comes up, varied by day.
      values.topic = topics[hash(`${dayKey}:topic`) % topics.length].title;
    }

    push(`reminder-${dayKey}`, fireAt, category, variantOf(category, hash(`${dayKey}:${category}`), REMINDER_COPY[language][category].length), values);
  }

  return plan;
}

interface Eligibility {
  due: number;
  hasWords: boolean;
  hasTopics: boolean;
}

function pickRotation(seed: number, previous: ReminderCategory | null, { due, hasWords, hasTopics }: Eligibility): ReminderCategory {
  // Words due is the most useful nudge, so it wins outright on roughly every other day it applies.
  if (due >= MIN_DUE_WORDS && previous !== 'wordsDue' && seed % 2 === 0) return 'wordsDue';
  for (let step = 0; step < ROTATION.length; step += 1) {
    const candidate = ROTATION[(seed + step) % ROTATION.length];
    if (candidate === previous) continue;
    if (candidate === 'wordsDue' && due < MIN_DUE_WORDS) continue;
    // The word game needs saved words to play with.
    if (candidate === 'game' && !hasWords) continue;
    if (candidate === 'topic' && !hasTopics) continue;
    return candidate;
  }
  return 'talk';
}

function build(id: string, fireAt: number, category: ReminderCategory, variant: number, values: Record<string, string | number>, language: Language): PlannedReminder {
  const text = REMINDER_COPY[language][category][variant];
  return { id, at: fireAt, category, title: fill(text.title, values), body: fill(text.body, values), url: ROUTES[category] };
}
