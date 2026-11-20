import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withDecay,
  withDelay,
  withSequence,
  withTiming,
  type FrameInfo,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from '@/components/ui/AppText';
import { haptics } from '@/services/haptics';
import { spacing } from '@/theme';
import { usePalette, type Appearance } from '@/theme/appearance';
import { easing } from '@/theme/motion';

import { ShortcutArt } from './ShortcutArt';
import type { Shortcut } from './ShortcutGrid';
import { ACCENTS, BODY, mix, RailHeader, rgba } from './ShortcutRail';

const CARD_W = 100;
const CARD_H = 92;
const RADIUS = 18;
const ART = 62;
const GO = 22;
/** The ring bleeds to the screen edges (the sheet pads by spacing.xl), like the rail. */
const PAD = spacing.xl;
/**
 * The ring is seen almost level, so it takes no more height than the old rail: the card at the back
 * sits only this much higher, and shows between the cards in front rather than above them.
 */
const LIFT = 10;
/** Size and opacity of the card right at the back; the ones in between scale with their depth. */
const BACK_SCALE = 0.6;
const BACK_OPACITY = 0.4;
/** How far a card at the side has turned away, in degrees. */
const SIDE_TURN = 48;
const PERSPECTIVE = 700;
/** Room above the cards and under the front card's shadow. */
const ROOM_TOP = 4;
const ROOM_BOTTOM = 12;
/** Centre of the front card, from the top of the ring: whichever card reaches higher, front or back. */
const BASE_Y = ROOM_TOP + Math.max(CARD_H / 2, LIFT + (CARD_H * BACK_SCALE) / 2);
const HEIGHT = BASE_Y + CARD_H / 2 + ROOM_BOTTOM;
/** One full turn of the belt when it runs by itself, and the wait before it runs again after a touch. */
const TURN_MS = 28_000;
const RESUME_AFTER = 2500;
/** The objects float on one shared loop, each a little behind the next. */
const CYCLE = 6400;
const FLOAT = 4;
/** A tapped card at the back (or far side) is turned to the front instead of opened. */
const OPENS_FROM_DEPTH = 0.5;

/** The ring's radius for the width it has: as wide as fits, the side cards clear of the screen edge. */
function radiusFor(span: number) {
  'worklet';
  return Math.min(150, Math.max(100, span / 2 - CARD_W * 0.3));
}

/** `angle` folded into (-π, π]: 0 is right in front. */
function wrap(angle: number) {
  'worklet';
  return angle - 2 * Math.PI * Math.round(angle / (2 * Math.PI));
}

/** Where a card at `angle` on the ring shows on screen, relative to the front card's place. */
function pose(angle: number, span: number) {
  'worklet';
  const depth = Math.cos(angle); // 1 in front, -1 at the back
  const near = (depth + 1) / 2;
  const scale = BACK_SCALE + (1 - BACK_SCALE) * near;
  return {
    // Farther cards draw nearer the middle, as in a real perspective view: the ones going round the
    // back show in the gaps between the ones in front.
    x: radiusFor(span) * Math.sin(angle) * scale,
    y: -LIFT * (1 - near),
    depth,
    scale,
    turn: SIDE_TURN * Math.sin(angle),
  };
}

interface ShortcutRingProps {
  items: Shortcut[];
  title?: string;
  seeAllLabel?: string;
  onSeeAll?: () => void;
}

/**
 * The home shortcuts on a turning 3D ring, like a belt: the cards in front are big and bright, the
 * ones going round the back smaller, fainter and higher, still in view. It turns slowly by itself
 * while the home tab is on screen; a swipe spins it (it coasts to a stop) and it runs on a moment
 * after. Tapping a card in front opens it; tapping one further round turns it to the front.
 * Reduced motion: it stands still and only turns under the finger.
 */
export function ShortcutRing({ items, title, seeAllLabel, onSeeAll }: ShortcutRingProps) {
  const palette = usePalette();
  const look: Appearance = palette.appearance;
  const still = useReducedMotion();
  const count = items.length;
  const step = count > 0 ? (2 * Math.PI) / count : 0;

  const span = useSharedValue(0);
  /** The belt's own slow run, and what the finger added on top of it. Both in radians. */
  const drift = useSharedValue(0);
  const spin = useSharedValue(still ? 0 : 1.6);
  const spinAtStart = useSharedValue(0);
  /** 0 → 1: how fast the belt runs by itself right now (it eases off under a touch and back after). */
  const drive = useSharedValue(still ? 0 : 1);
  const clock = useSharedValue(0);
  const pressedSlot = useSharedValue(-1);
  const press = useSharedValue(0);
  /** A swipe is turning the ring: a tap that lost to it must not set the belt running under the finger. */
  const dragging = useSharedValue(false);

  const open = useCallback(
    (slot: number) => {
      const item = items[slot];
      if (!item) return;
      haptics.light();
      item.onPress();
    },
    [items],
  );
  const turned = useCallback(() => haptics.selection(), []);

  // Comes in with a half turn into place.
  useEffect(() => {
    if (!still) spin.set(withTiming(0, { duration: 1200, easing: easing.out }));
  }, [spin, still]);

  const tick = useCallback(
    (frame: FrameInfo) => {
      'worklet';
      const dt = Math.min(frame.timeSincePreviousFrame ?? 0, 64);
      // Cards in front move right to left, as the rail did.
      drift.set(wrap(drift.get() - ((2 * Math.PI) / TURN_MS) * dt * drive.get()));
      clock.set((clock.get() + dt / CYCLE) % 1);
    },
    [drift, drive, clock],
  );
  const life = useFrameCallback(tick, false);

  // Everything moves only while the home tab is on screen.
  useFocusEffect(
    useCallback(() => {
      if (still) return;
      life.setActive(true);
      return () => life.setActive(false);
    }, [life, still]),
  );

  const gesture = useMemo(() => {
    const hold = () => {
      'worklet';
      drive.set(withTiming(0, { duration: 180 }));
    };
    const resume = () => {
      'worklet';
      if (!still && !dragging.get()) drive.set(withDelay(RESUME_AFTER, withTiming(1, { duration: 900 })));
    };

    const pan = Gesture.Pan()
      // Only sideways moves turn the ring; up and down still scroll the page.
      .activeOffsetX([-8, 8])
      .failOffsetY([-12, 12])
      .onBegin(() => {
        hold();
        cancelAnimation(spin);
        spinAtStart.set(spin.get());
      })
      .onStart(() => {
        dragging.set(true);
      })
      .onUpdate((event) => {
        spin.set(spinAtStart.get() + event.translationX / radiusFor(span.get()));
      })
      .onEnd((event) => {
        spin.set(withDecay({ velocity: event.velocityX / radiusFor(span.get()), deceleration: 0.996 }));
      })
      .onFinalize(() => {
        dragging.set(false);
        resume();
      });

    const tap = Gesture.Tap()
      .maxDuration(400)
      .onBegin(() => hold())
      .onEnd((event, success) => {
        if (!success || count === 0) return;
        // The card under the finger, the front-most one where they overlap.
        const width = span.get();
        let hit = -1;
        let hitDepth = -2;
        for (let slot = 0; slot < count; slot++) {
          const p = pose(slot * step + drift.get() + spin.get(), width);
          const halfW = (CARD_W / 2) * p.scale * Math.cos((p.turn * Math.PI) / 180);
          const halfH = (CARD_H / 2) * p.scale;
          const dx = Math.abs(event.x - (width / 2 + p.x));
          const dy = Math.abs(event.y - (BASE_Y + p.y));
          if (dx <= halfW && dy <= halfH && p.depth > hitDepth) {
            hit = slot;
            hitDepth = p.depth;
          }
        }
        if (hit < 0) return;

        if (hitDepth >= OPENS_FROM_DEPTH) {
          pressedSlot.set(hit);
          press.set(withSequence(withTiming(1, { duration: 90 }), withTiming(0, { duration: 280, easing: easing.overshoot })));
          scheduleOnRN(open, hit);
        } else {
          cancelAnimation(spin);
          const angle = wrap(hit * step + drift.get() + spin.get());
          spin.set(withTiming(spin.get() - angle, { duration: 650, easing: easing.out }));
          scheduleOnRN(turned);
        }
      })
      .onFinalize(() => resume());

    return Gesture.Race(pan, tap);
  }, [count, step, still, drive, dragging, spin, spinAtStart, span, drift, pressedSlot, press, open, turned]);

  return (
    <View style={styles.section}>
      {title ? <RailHeader title={title} seeAllLabel={seeAllLabel} onSeeAll={onSeeAll} palette={palette} /> : null}
      <GestureHandlerRootView style={styles.ringRoot}>
        <GestureDetector gesture={gesture}>
          <View style={styles.ring} onLayout={(event) => span.set(event.nativeEvent.layout.width)}>
            {items.map(({ key, ...item }, slot) => (
              <RingCard
                key={key}
                id={key}
                angle={slot * step}
                slot={slot}
                look={look}
                still={still}
                span={span}
                drift={drift}
                spin={spin}
                clock={clock}
                pressedSlot={pressedSlot}
                press={press}
                onOpen={open}
                {...item}
              />
            ))}
          </View>
        </GestureDetector>
      </GestureHandlerRootView>
    </View>
  );
}

interface RingCardProps extends Omit<Shortcut, 'key' | 'onPress'> {
  id: string;
  /** Its place on the ring when the ring has not turned. */
  angle: number;
  slot: number;
  look: Appearance;
  still: boolean;
  span: SharedValue<number>;
  drift: SharedValue<number>;
  spin: SharedValue<number>;
  clock: SharedValue<number>;
  pressedSlot: SharedValue<number>;
  press: SharedValue<number>;
  onOpen: (slot: number) => void;
}

function RingCard({ id, angle, slot, look, still, span, drift, spin, clock, pressedSlot, press, onOpen, label, art, image }: RingCardProps) {
  const body = BODY[look];
  const accent = ACCENTS[id] ?? ACCENTS.words;
  const glow = rgba(accent, body.glow);

  const cardStyle = useAnimatedStyle(() => {
    const width = span.get();
    const p = pose(angle + drift.get() + spin.get(), width);
    const pressed = pressedSlot.get() === slot ? press.get() : 0;
    return {
      // Few steps, so the order changes only when cards really pass each other.
      zIndex: Math.round((p.depth + 1) * 4),
      opacity: BACK_OPACITY + (1 - BACK_OPACITY) * Math.min(1, (p.depth + 1) / 1.4),
      transform: [
        { translateX: width / 2 - CARD_W / 2 + p.x },
        { translateY: p.y },
        { perspective: PERSPECTIVE },
        { rotateY: `${p.turn}deg` },
        { scale: p.scale * (1 - 0.06 * pressed) },
      ],
    };
  });

  const objectStyle = useAnimatedStyle(() => {
    const lift = still ? 0.5 : 0.5 - 0.5 * Math.cos(2 * Math.PI * (2 * clock.get() + slot * 0.17));
    return { transform: [{ translateY: FLOAT / 2 - FLOAT * lift }] };
  });

  return (
    <Animated.View
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      // Touches go to the ring's gestures, so screen readers open the card through these instead.
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'activate') onOpen(slot);
      }}
      style={[styles.card, { boxShadow: body.shadow(accent) }, cardStyle]}
    >
      <View pointerEvents="none" style={[styles.inner, { borderColor: body.rim(accent) }]}>
        <LinearGradient
          colors={[mix(body.base, accent, body.top), mix(body.base, accent, body.bottom)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.art}>
          <View style={[styles.glow, { backgroundColor: glow, boxShadow: `0 0 22px 12px ${glow}` }]} />
          <Animated.View style={objectStyle}>
            {image ? (
              <Image source={image} style={styles.image} contentFit="contain" transition={150} />
            ) : (
              <ShortcutArt name={art} size={ART - 16} />
            )}
          </Animated.View>
        </View>
        <View style={styles.foot}>
          <AppText color={body.label} numberOfLines={1} adjustsFontSizeToFit style={styles.label}>
            {label}
          </AppText>
          <View style={[styles.go, { backgroundColor: accent, boxShadow: `0 3px 8px ${rgba(accent, 0.4)}` }]}>
            <Ionicons name="arrow-up" size={12} color="#FFFFFF" style={styles.goIcon} />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  ringRoot: { flexGrow: 0, marginHorizontal: -PAD },
  ring: { height: HEIGHT },
  card: { position: 'absolute', left: 0, top: BASE_Y - CARD_H / 2, width: CARD_W, height: CARD_H, borderRadius: RADIUS },
  inner: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.sm + 2,
    paddingBottom: spacing.sm + 2,
    borderRadius: RADIUS,
    borderWidth: 1,
    overflow: 'hidden',
  },
  art: {
    position: 'absolute',
    top: 0,
    right: 6,
    width: ART,
    height: ART,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: { position: 'absolute', width: ART * 0.5, height: ART * 0.5, borderRadius: ART },
  image: { width: ART, height: ART },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { flex: 1, fontSize: 13, lineHeight: 17, fontWeight: '800', letterSpacing: -0.2 },
  go: { width: GO, height: GO, borderRadius: GO / 2, alignItems: 'center', justifyContent: 'center' },
  goIcon: { transform: [{ rotate: '45deg' }] },
});
