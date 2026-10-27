import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { Easing, LinearTransition, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { colors, radii, shadows, spacing } from '@/theme';
import { duration, easing } from '@/theme/motion';

const OPEN = { duration: duration.sheetIn, easing: easing.out };
const CLOSE = { duration: duration.sheetOut, easing: easing.in };
const REDUCED = { duration: duration.fast, easing: Easing.linear };
/** Content that grows or shrinks while open (loading → result) eases to its new height. */
const RESIZE = LinearTransition.duration(duration.base).easing(easing.out);
/** Dragged further than this share of its height, or flicked down, the sheet closes. */
const DISMISS_SHARE = 0.3;
const DISMISS_VELOCITY = 900;

interface BottomSheetProps {
  visible: boolean;
  /** Backdrop tap, back button and drag-down call this. Leave undefined to lock the sheet open. */
  onClose?: () => void;
  /** After the sheet has fully slid away: the moment to navigate, so two motions never overlap. */
  onClosed?: () => void;
  /** Read by screen readers for the backdrop. */
  closeLabel: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Modal bottom sheet. It slides in only after its first layout, so it never flashes at its final
 * spot or stutters while the modal window is still being created; it stays mounted until it has
 * slid out, eases between heights, and can be dragged down by its handle.
 */
export function BottomSheet({ visible, onClose, onClosed, closeLabel, children, style }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const [sheetHeight, setSheetHeight] = useState(0);
  const offset = useSharedValue(windowHeight);
  const backdrop = useSharedValue(0);
  const closedRef = useRef(onClosed);

  useEffect(() => {
    closedRef.current = onClosed;
  }, [onClosed]);

  if (visible && !mounted) setMounted(true);

  // Unmounted, it measures itself afresh next time, so it again waits for its first layout to slide in.
  const unmount = useCallback(() => {
    setMounted(false);
    setSheetHeight(0);
    closedRef.current?.();
  }, []);

  const hidden = sheetHeight || windowHeight;
  const open = visible && sheetHeight > 0;

  useEffect(() => {
    if (!mounted) return;
    if (open) {
      offset.set(withTiming(0, reduceMotion ? REDUCED : OPEN));
      backdrop.set(withTiming(1, reduceMotion ? REDUCED : OPEN));
    } else if (!visible) {
      backdrop.set(withTiming(0, reduceMotion ? REDUCED : CLOSE));
      offset.set(
        withTiming(hidden, reduceMotion ? REDUCED : CLOSE, (finished) => {
          if (finished) scheduleOnRN(unmount);
        }),
      );
    }
  }, [open, visible, mounted, hidden, reduceMotion, offset, backdrop, unmount]);

  const drag = useMemo(
    () =>
      Gesture.Pan()
        .enabled(onClose !== undefined)
        .activeOffsetY(6)
        .onUpdate((event) => {
          // Upwards it only gives a little, like a rubber band.
          offset.set(event.translationY > 0 ? event.translationY : event.translationY * 0.15);
          backdrop.set(1 - Math.max(0, event.translationY) / hidden);
        })
        .onEnd((event) => {
          if (event.translationY > hidden * DISMISS_SHARE || event.velocityY > DISMISS_VELOCITY) {
            if (onClose) scheduleOnRN(onClose);
            return;
          }
          offset.set(withTiming(0, OPEN));
          backdrop.set(withTiming(1, OPEN));
        }),
    [onClose, hidden, offset, backdrop],
  );

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.get() }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.get() }));

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={() => onClose?.()} statusBarTranslucent navigationBarTranslucent>
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} disabled={!onClose} accessibilityLabel={closeLabel} />
        </Animated.View>
        <Animated.View
          layout={RESIZE}
          onLayout={(event) => setSheetHeight(event.nativeEvent.layout.height)}
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.sm }, style, sheetStyle]}
        >
          <GestureDetector gesture={drag}>
            <View style={styles.handleArea} accessible={false}>
              <View style={styles.grabber} />
            </View>
          </GestureDetector>
          {children}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(14, 27, 44, 0.45)' },
  sheet: {
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    backgroundColor: colors.surface,
    ...shadows.raised,
  },
  handleArea: { alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.xs, marginHorizontal: -spacing.xl },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border },
});
