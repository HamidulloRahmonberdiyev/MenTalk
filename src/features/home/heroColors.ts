/** Colours of the home hero: a bright sky-blue band in both themes, in the app's own blue. */
export const HERO = {
  /** Top to bottom of the band. */
  gradient: ['#4CC6FA', '#2AABEE', '#1A8BD8'] as const,
  /** What shows past the band (pull-to-refresh, overscroll): its first colour. */
  base: '#4CC6FA',
  /** Dark ink on white chips inside the band (today's tile). */
  deep: '#0B4F86',
  /** The band's middle colour, for rims that should blend into it. */
  mid: '#2AABEE',
  accent: '#1A8BD8',
  accentSoft: '#FFFFFF',
  flame: '#FFC233',
  /** Warm text on the band (goal reached). */
  flameInk: '#FFE58A',
  muted: 'rgba(255,255,255,0.85)',
  faint: 'rgba(255,255,255,0.6)',
} as const;
