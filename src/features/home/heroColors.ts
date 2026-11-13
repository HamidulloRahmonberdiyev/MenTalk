import { usePalette, type Appearance } from '@/theme/appearance';

/**
 * The home hero's band, per look: bright sky blue in light mode, a deep sapphire night in dark
 * mode (the same blue family as the 3D icons and the dark shortcut tiles). Everything drawn on it is white or amber, so only the band itself and its inks change.
 */
export const HERO_TONES = {
  light: {
    /** Top to bottom of the band. */
    gradient: ['#4CC6FA', '#2AABEE', '#1A8BD8'] as const,
    /** What shows past the band (pull-to-refresh, overscroll): its first colour. */
    base: '#4CC6FA',
    /** Dark ink on white chips inside the band (today's circle, the Today chip). */
    deep: '#0B4F86',
    /** The band's middle colour, for rims that should blend into it. */
    mid: '#2AABEE',
  },
  dark: {
    gradient: ['#2D5AA8', '#1F3F7A', '#152A52'] as const,
    base: '#2D5AA8',
    deep: '#16326A',
    mid: '#1F3F7A',
  },
} satisfies Record<Appearance, { gradient: readonly [string, string, string]; base: string; deep: string; mid: string }>;

export type HeroTone = (typeof HERO_TONES)[Appearance];

/** The hero band for the look chosen in the profile. */
export function useHeroTone(): HeroTone {
  return HERO_TONES[usePalette().appearance];
}

/** What is drawn on the band: the same in both looks. */
export const HERO = {
  flame: '#FFC233',
  /** Warm text on the band (goal reached). */
  flameInk: '#FFE58A',
  muted: 'rgba(255,255,255,0.85)',
  faint: 'rgba(255,255,255,0.6)',
} as const;
