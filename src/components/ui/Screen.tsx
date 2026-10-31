import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/theme';
import { useThemedStyles, type Palette } from '@/theme/appearance';

interface ScreenProps {
  children: ReactNode;
  /** Horizontal gutter. Pass 0 for full-bleed layouts. */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Base screen container that respects the device safe area. */
export function Screen({ children, padded = true, style }: ScreenProps) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom, spacing.lg),
          paddingHorizontal: padded ? spacing.xl : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const createStyles = (home: Palette) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: home.background,
  },
});
