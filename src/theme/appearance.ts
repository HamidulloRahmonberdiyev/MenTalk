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
  /** Lifts the home sheet off the top area. */
  sheetShadow: 'none',
  track: '#1E2026',
  text: '#FFFFFF',
  textMuted: '#9AA3B2',
  /** Body copy that is quieter than the text but louder than muted hints. */
  textSecondary: '#B9C0CC',
  /** Blue-tinted fills: icon badges, soft buttons, selected rows. */
  primarySoft: '#1D3A52',
  primaryTint: '#1A2E40',
  rim: '#3B3F4A',
  /** The heavier bottom edge of outlined cards and 3D buttons. */
  rimBottom: '#3B3F4A',
  edge: '#15161A',
  handle: 'rgba(255, 255, 255, 0.35)',
  badge: '#EF4444',
  /** Selected option fill under a blue rim. */
  selected: '#17344A',
  accent: '#6FC3F5',
  dangerFill: '#3A2328',
  dangerInk: '#FF8A8A',
  successFill: '#1C3527',
  successInk: '#5BE08F',
  dangerRim: '#5A2A2E',
  dangerEdge: '#8E1F1F',
  warningFill: '#3A3222',
  /** Floating tab bar. */
  tabGlass: 'rgba(24, 25, 30, 0.92)',
  tabRim: 'rgba(255, 255, 255, 0.06)',
  tabInactive: '#8E95A3',
};

export type Palette = typeof dark;

const light: Palette = {
  appearance: 'light',
  statusBar: 'dark',
  // Cool off-white page, pure white cards: the cards read as raised without any grey wash.
  background: '#F3F6FA',
  header: '#FFFFFF',
  divider: 'rgba(16, 24, 40, 0.07)',
  panel: '#FFFFFF',
  sheet: '#FFFFFF',
  sheetShadow: '0 -8px 24px rgba(16, 24, 40, 0.06)',
  track: '#F2F5F9',
  text: '#101828',
  textMuted: '#667085',
  textSecondary: '#475467',
  primarySoft: '#E1F3FC',
  primaryTint: '#F0FAFE',
  rim: '#E4E9F0',
  rimBottom: '#D3DBE5',
  edge: '#D0D8E2',
  handle: 'rgba(16, 24, 40, 0.14)',
  badge: '#EF4444',
  selected: '#E6F5FE',
  accent: '#1690D4',
  dangerFill: '#FFF2F2',
  dangerInk: '#B42318',
  successFill: '#E3F8EE',
  successInk: '#0F7A4B',
  dangerRim: '#F9D0D0',
  dangerEdge: '#F0B0B0',
  warningFill: '#FFF7E8',
  tabGlass: 'rgba(255, 255, 255, 0.96)',
  tabRim: 'rgba(16, 24, 40, 0.06)',
  tabInactive: '#98A2B3',
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
