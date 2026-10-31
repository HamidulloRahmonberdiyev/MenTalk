import { StyleSheet, View, type ViewProps } from 'react-native';

import { radii, spacing } from '@/theme';
import { useThemedStyles, type Palette } from '@/theme/appearance';

export function Card({ style, ...rest }: ViewProps) {
  const styles = useThemedStyles(createStyles);
  return <View {...rest} style={[styles.card, style]} />;
}

const createStyles = (home: Palette) => StyleSheet.create({
  card: {
    backgroundColor: home.panel,
    borderRadius: radii.lg,
    padding: spacing.lg,
    // Duolingo-style outline: a thin rim with a heavier bottom edge instead of a soft shadow.
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: home.rim,
  },
});
