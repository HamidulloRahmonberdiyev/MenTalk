import { useSettingsStore } from '@/store/settingsStore';

export type Appearance = 'dark' | 'light';

/**
 * Surfaces and inks of the redesigned screens (tabs, profile), in both looks. Cards everywhere
 * share one Duolingo-style outline: a thin `rim` over a heavier bottom edge.
 */
const dark = {
  appearance: 'dark' as Appearance,
  statusBar: 'light' as 'light' | 'dark',
  background: '#1B1C21',
  header: '#212228',
  divider: 'rgba(255, 255, 255, 0.12)',
  panel: '#2A2D35',
  sheet: '#30343D',
  track: '#1E2026',
  text: '#FFFFFF',
  textMuted: '#9AA3B2',
  rim: '#3B3F4A',
  edge: '#15161A',
  handle: 'rgba(255, 255, 255, 0.35)',
  badge: '#EF4444',
  /** Selected option fill under a blue rim. */
  selected: '#17344A',
  accent: '#6FC3F5',
  dangerFill: '#3A2328',
  dangerRim: '#5A2A2E',
  dangerEdge: '#8E1F1F',
  warningFill: '#3A3222',
  /** Shortcut tiles on the home sheet. */
  tile: '#3A4560',
  tileEdge: '#252C40',
  glyph: '#6CC0FF',
  glyphShadow: '#1F5FB8',
  /** Floating tab bar. */
  tabGlass: 'rgba(24, 25, 30, 0.92)',
  tabRim: 'rgba(255, 255, 255, 0.06)',
  tabInactive: '#8E95A3',
};

export type Palette = typeof dark;

const light: Palette = {
  appearance: 'light',
  statusBar: 'dark',
  background: '#EEF2F7',
  header: '#FFFFFF',
  divider: 'rgba(14, 27, 44, 0.08)',
  panel: '#FFFFFF',
  sheet: '#F8FAFD',
  track: '#F1F4F8',
  text: '#14202E',
  textMuted: '#6B7788',
  rim: '#E2E7EE',
  edge: '#CBD3DE',
  handle: 'rgba(14, 27, 44, 0.15)',
  badge: '#EF4444',
  selected: '#E3F4FD',
  accent: '#1A8FD0',
  dangerFill: '#FFF1F1',
  dangerRim: '#F6CACA',
  dangerEdge: '#EBA3A3',
  warningFill: '#FFF6E5',
  tile: '#DDEBFC',
  tileEdge: '#B9D0EE',
  glyph: '#3D9BF0',
  glyphShadow: '#1F5FB8',
  tabGlass: 'rgba(255, 255, 255, 0.94)',
  tabRim: 'rgba(14, 27, 44, 0.08)',
  tabInactive: '#8B98A8',
};

export const palettes: Record<Appearance, Palette> = { dark, light };

/** The palette for the look chosen in the profile; re-renders when it changes. */
export function usePalette(): Palette {
  return palettes[useSettingsStore((state) => state.appearance)];
}

const cache = new WeakMap<object, Partial<Record<Appearance, unknown>>>();

/**
 * Styles built from the palette, created once per look. Write the factory at module level
 * (`const createStyles = (p: Palette) => StyleSheet.create({...})`) so the cache can key on it.
 */
export function useThemedStyles<T>(factory: (palette: Palette) => T): T {
  const palette = usePalette();
  let entry = cache.get(factory);
  if (!entry) {
    entry = {};
    cache.set(factory, entry);
  }
  return (entry[palette.appearance] ??= factory(palette)) as T;
}
