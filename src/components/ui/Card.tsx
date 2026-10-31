import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radii, spacing } from '@/theme';

export function Card({ style, ...rest }: ViewProps) {
  return <View {...rest} style={[styles.card, style]} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    // Duolingo-style outline: a thin rim with a heavier bottom edge instead of a soft shadow.
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.border,
  },
});
