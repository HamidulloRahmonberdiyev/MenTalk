import { Ionicons } from '@expo/vector-icons';
import type { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useEffect, useState, type ComponentProps } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { haptics } from '@/services/haptics';
import { colors, radii, spacing } from '@/theme';
import type { IconName } from '@/types';

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export const TAB_BAR_HEIGHT = 68;
export const TAB_BAR_SPACE = TAB_BAR_HEIGHT + spacing.xxl;

const INNER_PADDING = 6;
const SPRING = { damping: 18, stiffness: 220, mass: 0.8 };

interface TabIcons {
  idle: IconName;
  active: IconName;
}

export type TabIconMap = Record<string, TabIcons>;

interface FloatingTabBarProps extends BottomTabBarProps {
  icons: TabIconMap;
}

export function FloatingTabBar({ state, descriptors, navigation, icons }: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const slot = state.routes.length ? (width - INNER_PADDING * 2) / state.routes.length : 0;
  const offset = useSharedValue(0);

  useEffect(() => {
    offset.value = withSpring(state.index * slot, SPRING);
  }, [state.index, slot, offset]);

  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, spacing.md) }]}>
      <View style={styles.shadow}>
        <View style={styles.bar} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
          {Platform.OS !== 'web' ? (
            <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
          ) : null}
          <View style={[StyleSheet.absoluteFill, styles.glass]} />

          {slot > 0 ? <Animated.View style={[styles.indicator, { width: slot }, indicatorStyle]} /> : null}

          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const { options } = descriptors[route.key];
            const tabIcons = icons[route.name];
            const tint = focused ? colors.primary : colors.textMuted;

            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                haptics.selection();
                navigation.navigate(route.name, route.params);
              }
            };

            return (
              <PressableScale
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={options.title}
                scaleTo={0.92}
                onPress={onPress}
                style={styles.tab}
              >
                <Ionicons name={focused ? tabIcons.active : tabIcons.idle} size={24} color={tint} />
                <AppText variant="captionStrong" color={tint} style={styles.label} numberOfLines={1}>
                  {options.title}
                </AppText>
              </PressableScale>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
  },
  shadow: {
    borderRadius: radii.pill,
    boxShadow: '0 14px 34px rgba(23, 64, 128, 0.22)',
  },
  bar: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    padding: INNER_PADDING,
    borderRadius: radii.pill,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
  },
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  indicator: {
    position: 'absolute',
    top: INNER_PADDING,
    bottom: INNER_PADDING,
    left: INNER_PADDING,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(31, 122, 255, 0.12)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
  },
});
