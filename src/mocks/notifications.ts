import type { AppNotification } from '@/features/notifications/types';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Sample notifications so the screen can be designed and tried before the server sends real ones. */
export function demoNotifications(now: number): AppNotification[] {
  return [
    {
      id: 'demo-streak',
      kind: 'streak',
      title: { key: 'notif.demo.streak.title' },
      body: { key: 'notif.demo.streak.body', params: { n: 5 } },
      createdAt: now - 4 * MINUTE,
      read: false,
      action: { href: '/scenarios', label: { key: 'notif.action.talk' } },
    },
    {
      id: 'demo-review',
      kind: 'review',
      title: { key: 'notif.demo.review.title' },
      body: { key: 'notif.demo.review.body', params: { n: 12 } },
      createdAt: now - 2 * HOUR,
      read: false,
      action: { href: '/words', label: { key: 'notif.action.review' } },
    },
    {
      id: 'demo-achievement',
      kind: 'achievement',
      title: { key: 'notif.demo.achievement.title' },
      body: { key: 'notif.demo.achievement.body' },
      createdAt: now - 5 * HOUR,
      read: false,
    },
    {
      id: 'demo-pronunciation',
      kind: 'pronunciation',
      title: { key: 'notif.demo.pronunciation.title' },
      body: { key: 'notif.demo.pronunciation.body' },
      createdAt: now - DAY - 3 * HOUR,
      read: true,
      action: { href: '/pronunciation', label: { key: 'notif.action.practice' } },
    },
    {
      id: 'demo-lesson',
      kind: 'lesson',
      title: { key: 'notif.demo.lesson.title' },
      body: { key: 'notif.demo.lesson.body' },
      createdAt: now - DAY - 7 * HOUR,
      read: true,
      action: { href: '/scenarios', label: { key: 'notif.action.open' } },
    },
    {
      id: 'demo-news',
      kind: 'news',
      title: { key: 'notif.demo.news.title' },
      body: { key: 'notif.demo.news.body' },
      createdAt: now - 4 * DAY,
      read: true,
    },
  ];
}
