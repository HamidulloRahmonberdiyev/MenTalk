import { usePalette, type Appearance } from '@/theme/appearance';

/**
 * The home hero's band, per look: bright sky blue in light mode, a deep indigo-violet night in dark
 * mode. Everything drawn on it is white or amber, so only the band itself and its inks change.
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
    gradient: ['#5B45D6', '#3F2FA3', '#2A2170'] as const,
    base: '#5B45D6',
    deep: '#2E2384',
    mid: '#3F2FA3',
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
