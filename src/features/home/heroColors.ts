/** Colours of the home hero: a deep navy band in both themes, lit by the app's blue. */
export const HERO = {
  /** Top to bottom of the band. */
  gradient: ['#0A1B33', '#0E2C52', '#14457A'] as const,
  /** What shows past the band (pull-to-refresh, overscroll): its last colour. */
  base: '#14457A',
  deep: '#0A1B33',
  accent: '#2AABEE',
  accentSoft: '#8FD6FB',
  flame: '#FFB020',
  muted: 'rgba(255,255,255,0.55)',
  faint: 'rgba(255,255,255,0.3)',
} as const;
