import { Text, type TextProps } from 'react-native';

import { typography, type TypographyVariant } from '@/theme';
import { usePalette } from '@/theme/appearance';

interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  /** Defaults to the current palette's text colour, so plain text reads in both looks. */
  color?: string;
}

export function AppText({ variant = 'body', color, style, ...rest }: AppTextProps) {
  const home = usePalette();
  return <Text {...rest} style={[typography[variant], { color: color ?? home.text }, style]} />;
}
