import { Text, type TextProps } from 'react-native';

import { colors, typography, type TypographyVariant } from '@/theme';

interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
}

export function AppText({ variant = 'body', color = colors.text, style, ...rest }: AppTextProps) {
  return <Text {...rest} style={[typography[variant], { color }, style]} />;
}
