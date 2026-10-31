import { Ionicons } from '@expo/vector-icons';
import type { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useEffect, useState, type ComponentProps } from 'react';
import { Keyboard, Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { haptics } from '@/services/haptics';
import { colors, radii, shadows, spacing } from '@/theme';
import type { IconName } from '@/types';

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export const TAB_BAR_HEIGHT = 76;
export const TAB_BAR_SPACE = TAB_BAR_HEIGHT + spacing.xxl;

const INNER_PADDING = 8;
const BUBBLE = TAB_BAR_HEIGHT - INNER_PADDING * 2;
const SPRING = { damping: 18, stiffness: 220, mass: 0.8 };
const INACTIVE = '#8E95A3';

export type TabIconMap = Record<string, IconName>;

/** The floating bar would sit on top of the keyboard, so it steps aside while typing. */
function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}

interface FloatingTabBarProps extends BottomTabBarProps {
  icons: TabIconMap;
}

export function FloatingTabBar({ state, descriptors, navigation, icons }: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const slot = state.routes.length ? (width - INNER_PADDING * 2) / state.routes.length : 0;
  const offset = useSharedValue(0);
  const keyboardOpen = useKeyboardVisible();

  useEffect(() => {
    offset.value = withSpring(state.index * slot, SPRING);
  }, [state.index, slot, offset]);

  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));

  if (keyboardOpen) return null;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, spacing.md) }]}>
      <View style={styles.shadow}>
        <View style={styles.bar} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
          {Platform.OS !== 'web' ? (
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
          ) : null}
          <View style={[StyleSheet.absoluteFill, styles.glass]} />

          {slot > 0 ? (
            <Animated.View style={[styles.indicator, { width: slot }, indicatorStyle]}>
              <View style={styles.bubble} />
            </Animated.View>
          ) : null}

          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const { options } = descriptors[route.key];

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
                {/* The active tab is just its icon inside the blue bubble, as in Englify. */}
                <Ionicons name={icons[route.name]} size={focused ? 28 : 24} color={focused ? colors.onPrimary : INACTIVE} />
                {focused ? null : (
                  <AppText variant="captionStrong" color={INACTIVE} style={styles.label} numberOfLines={1}>
                    {options.title}
                  </AppText>
                )}
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
    boxShadow: '0 14px 34px rgba(0, 0, 0, 0.35)',
  },
  bar: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    padding: INNER_PADDING,
    borderRadius: radii.pill,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  glass: {
    backgroundColor: 'rgba(24, 25, 30, 0.92)',
  },
  indicator: {
    position: 'absolute',
    top: INNER_PADDING,
    bottom: INNER_PADDING,
    left: INNER_PADDING,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    ...shadows.primary,
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
