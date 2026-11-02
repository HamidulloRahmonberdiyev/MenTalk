import type { IconName } from '@/types';

import type { NotificationKind } from './types';

interface KindStyle {
  icon: IconName;
  gradient: readonly [string, string];
  /** Solid colour for the unread accent and the action button. */
  tint: string;
}

/** Same colour language as the home screen: flame orange for streaks, violet for words, blue for talks. */
export const KIND_STYLES: Record<NotificationKind, KindStyle> = {
  streak: { icon: 'flame', gradient: ['#FFB443', '#FF7A00'], tint: '#FF9600' },
  review: { icon: 'library', gradient: ['#B79BFF', '#7B4FE0'], tint: '#9B6BFF' },
  achievement: { icon: 'trophy', gradient: ['#FFD84D', '#E5A100'], tint: '#E5A100' },
  lesson: { icon: 'chatbubbles', gradient: ['#6FA8E8', '#2F6DBF'], tint: '#3D82D6' },
  pronunciation: { icon: 'mic', gradient: ['#7BE495', '#2BB673'], tint: '#2BB673' },
  news: { icon: 'megaphone', gradient: ['#7FD3FF', '#1CB0F6'], tint: '#1CB0F6' },
};
