import type { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  primary: '#2AABEE',
  primaryDark: '#229ED9',
  primaryLight: '#6FC3F5',
  primarySoft: '#E1F3FC',
  primaryTint: '#F0FAFE',

  background: '#F1F7FB',
  surface: '#FFFFFF',
  border: '#DDEAF3',

  text: '#0E1B2C',
  textSecondary: '#5F6F82',
  textMuted: '#8B98A8',
  onPrimary: '#FFFFFF',

  success: '#22B573',
  danger: '#EF4444',
  warning: '#F5A524',
  purple: '#5A8DEE',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const shadows = {
  card: { boxShadow: '0 4px 18px rgba(20, 70, 100, 0.07)' },
  raised: { boxShadow: '0 10px 28px rgba(20, 70, 100, 0.14)' },
  primary: { boxShadow: '0 10px 24px rgba(42, 171, 238, 0.35)' },
} as const satisfies Record<string, ViewStyle>;

export const typography = {
  display: { fontSize: 38, lineHeight: 42, fontWeight: '800', letterSpacing: -1 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.5 },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.2 },
  subheading: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  captionStrong: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  button: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
