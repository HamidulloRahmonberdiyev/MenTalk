import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useScrollOffset,
  useSharedValue,
  withDelay,
  withTiming,
  type EntryExitAnimationFunction,
  type FrameInfo,
  type SharedValue,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { haptics } from '@/services/haptics';
import { spacing } from '@/theme';
import { usePalette, type Appearance, type Palette } from '@/theme/appearance';
import { easing } from '@/theme/motion';

import { ShortcutArt } from './ShortcutArt';
import type { Shortcut } from './ShortcutGrid';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const CARD_W = 120;
const CARD_H = 108;
const GAP = spacing.md;
const STEP = CARD_W + GAP;
/** The rail bleeds to the screen edges; the first card rests this far in. */
const PAD = spacing.xl;
/** Space inside the scroll view for the cards' shadows to fade out before its edge. */
const SHADOW_ROOM = 24;
const RADIUS = 20;
const ART = 80;
const GO = 26;
/** How often the rail moves on by itself, and how long it waits after the learner swipes it. */
const AUTO_EVERY = 3500;
const AUTO_RESUME_AFTER = 7000;

// Motion. The rail turns like a drum: cards swing away as they reach the screen edges and face the
// learner again as they come in. Each card breathes on one shared loop, a little behind its left
// neighbour, so a wave of light runs along the rail and every arrow nudges once it has passed.
const PERSPECTIVE = 640;
/** Turn and size of a card half off the screen. */
const EDGE_TURN = 42;
const EDGE_SCALE = 0.84;
/** The object sits in front of the card, so it travels a little further than the card while scrolling. */
const PARALLAX = 0.05;
const PARALLAX_MAX = 8;
/** One loop, in ms: the object floats twice in it, sways once, and the light crosses once. */
const CYCLE = 6400;
/** How far behind its left neighbour each card runs, as a share of the loop. */
const RIPPLE = 0.07;
const FLOAT = 5;
const SWAY = 4;
const SHINE_W = 46;
const SHINE_FROM = -SHINE_W - 40;
const SHINE_TO = CARD_W + 40;
/** The share of the loop the light takes to cross a card; the arrow nudges as it leaves. */
const SHINE_SPAN = 0.16;
const NUDGE_AT = 0.1;
const NUDGE_SPAN = 0.14;
/** A pressed card tips toward the finger by up to this many degrees. */
const TILT = 9;
const ENTER_DELAY = 120;
const ENTER_STAGGER = 70;

/** Each shortcut's own accent: it tints the card, the glow behind the object and the arrow. */
const ACCENTS: Record<string, string> = {
  topics: '#8B7CF6',
  history: '#3B9BFF',
  words: '#2F7BEA',
  game: '#14B8E6',
  translate: '#22C3A6',
  continue: '#3B82F6',
  mistakes: '#F43F6E',
  random: '#F43F6E',
  pronunciation: '#6366F1',
};

/**
 * The card body per look. At night each card is a deep shade of its accent, lighter at the top
 * left, with a faint accent rim; by day it is a pale wash of the accent on white.
 */
const BODY = {
  light: {
    base: '#FFFFFF',
    top: 0.2,
    bottom: 0.05,
    glow: 0.26,
    shine: 'rgba(255, 255, 255, 0.85)',
    label: '#1C243C',
    rim: (accent: string) => rgba(accent, 0.22),
    shadow: (accent: string) => `0 6px 14px ${rgba(accent, 0.2)}`,
  },
  dark: {
    base: '#141A2E',
    top: 0.46,
    bottom: 0.3,
    glow: 0.38,
    shine: 'rgba(255, 255, 255, 0.3)',
    label: '#FFFFFF',
    rim: (accent: string) => rgba(accent, 0.32),
    shadow: () => '0 8px 18px rgba(0, 0, 0, 0.35)',
  },
} as const;

function hexToRgb(hex: string) {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255] as const;
}

function rgba(hex: string, alpha: number) {
  return `rgba(${hexToRgb(hex).join(', ')}, ${alpha})`;
}

/** `base` with `amount` of `accent` mixed in. */
function mix(base: string, accent: string, amount: number) {
  const a = hexToRgb(base);
  const b = hexToRgb(accent);
  const channel = (i: number) => Math.round(a[i] + (b[i] - a[i]) * amount);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

/** Where card `index` is in the loop at `t`, from 0 to 1. */
function phase(t: number, index: number) {
  'worklet';
  return (((t - index * RIPPLE) % 1) + 1) % 1;
}

/** 0 → 1 → 0 while `u` is in [from, from + span], 0 elsewhere. */
function bump(u: number, from: number, span: number) {
  'worklet';
  const p = (u - from) / span;
  return p > 0 && p < 1 ? Math.sin(Math.PI * p) : 0;
}

/** How high the object has floated, 0 to 1; twice per loop. */
function rise(t: number, index: number) {
  'worklet';
  return 0.5 - 0.5 * Math.cos(2 * Math.PI * (2 * t + index * 0.17));
}

/** The card's left edge on screen, and the width of the screen (a sane guess before layout). */
function onScreen(index: number, scrollX: SharedValue<number>, span: SharedValue<number>) {
  'worklet';
  return {
    left: PAD + index * STEP - scrollX.get(),
    width: Math.max(span.get(), PAD * 2 + CARD_W * 2),
  };
}

/** Cards fly in from the right one after another, swinging round to face the learner. */
function entrance(index: number): EntryExitAnimationFunction {
  return () => {
    'worklet';
    const delay = ENTER_DELAY + index * ENTER_STAGGER;
    const settle = { duration: 760, easing: easing.overshoot };
    return {
      initialValues: {
        opacity: 0,
        transform: [
          { perspective: PERSPECTIVE },
          { translateX: 80 },
          { translateY: 14 },
          { rotateY: '55deg' },
          { rotate: '5deg' },
          { scale: 0.7 },
        ],
      },
      animations: {
        opacity: withDelay(delay, withTiming(1, { duration: 260, easing: easing.out })),
        transform: [
          { perspective: PERSPECTIVE },
          { translateX: withDelay(delay, withTiming(0, { duration: 640, easing: easing.out })) },
          { translateY: withDelay(delay, withTiming(0, settle)) },
          { rotateY: withDelay(delay, withTiming('0deg', settle)) },
          { rotate: withDelay(delay, withTiming('0deg', settle)) },
          { scale: withDelay(delay, withTiming(1, settle)) },
        ],
      },
    };
  };
}

interface ShortcutRailProps {
  items: Shortcut[];
  /** The section title above the rail; with `onSeeAll` it also gets a "see all" link. */
  title?: string;
  seeAllLabel?: string;
  onSeeAll?: () => void;
}

/**
 * The home shortcuts as a featured carousel of small cards. It slides on by itself every few
 * seconds (paused while the learner swipes), turns like a drum under the finger, and the cards
 * float, glint and tip toward a press. Reduced motion keeps only a plain press.
 */
export function ShortcutRail({ items, title, seeAllLabel, onSeeAll }: ShortcutRailProps) {
  const palette = usePalette();
  const look: Appearance = palette.appearance;
  const still = useReducedMotion();
  const list = useAnimatedRef<Animated.ScrollView>();
  const scrollX = useScrollOffset(list);
  const span = useSharedValue(0);
  const clock = useSharedValue(0);
  const [width, setWidth] = useState(0);
  const indexRef = useRef(0);
  const pausedUntil = useRef(0);
  // The last few cards fit on screen together, so the rail has fewer stops than cards.
  const visible = width ? Math.max(1, Math.floor((width - PAD + GAP) / STEP)) : 1;
  const pages = Math.max(1, items.length - visible + 1);
  const pagesRef = useRef(pages);
  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  const goTo = useCallback(
    (next: number) => {
      indexRef.current = next;
      list.current?.scrollTo({ x: next * STEP, animated: true });
    },
    [list],
  );

  // The loop advances by frame time, so pausing it on blur and resuming it later never jumps.
  const tick = useCallback(
    (frame: FrameInfo) => {
      'worklet';
      const dt = Math.min(frame.timeSincePreviousFrame ?? 0, 64);
      clock.set((clock.get() + dt / CYCLE) % 1);
    },
    [clock],
  );
  const life = useFrameCallback(tick, false);

  // Everything moves only while the home tab is on screen.
  useFocusEffect(
    useCallback(() => {
      if (still) return;
      life.setActive(true);
      const timer = setInterval(() => {
        if (Date.now() < pausedUntil.current || pagesRef.current < 2) return;
        goTo((indexRef.current + 1) % pagesRef.current);
      }, AUTO_EVERY);
      return () => {
        clearInterval(timer);
        life.setActive(false);
      };
    }, [goTo, life, still]),
  );

  // Keep the index valid if the list or the screen width changes.
  useEffect(() => {
    if (indexRef.current >= pages) goTo(0);
  }, [goTo, pages]);

  const onSettle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.min(Math.max(Math.round(event.nativeEvent.contentOffset.x / STEP), 0), pages - 1);
    indexRef.current = next;
  };

  return (
    <View
      style={styles.section}
      onLayout={(event) => {
        const next = event.nativeEvent.layout.width + PAD * 2;
        setWidth(next);
        span.set(next);
      }}
    >
      {title ? <RailHeader title={title} seeAllLabel={seeAllLabel} onSeeAll={onSeeAll} palette={palette} /> : null}
      <Animated.ScrollView
        ref={list}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={STEP}
        decelerationRate="fast"
        scrollEventThrottle={16}
        style={styles.rail}
        contentContainerStyle={styles.content}
        onScrollBeginDrag={() => {
          pausedUntil.current = Date.now() + AUTO_RESUME_AFTER;
        }}
        onMomentumScrollEnd={onSettle}
      >
        {items.map(({ key, ...item }, index) => (
          <RailCard
            key={key}
            id={key}
            index={index}
            look={look}
            still={still}
            clock={clock}
            scrollX={scrollX}
            span={span}
            {...item}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
}

function RailHeader({
  title,
  seeAllLabel,
  onSeeAll,
  palette,
}: {
  title: string;
  seeAllLabel?: string;
  onSeeAll?: () => void;
  palette: Palette;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTitle}>
        <Ionicons name="grid" size={15} color={palette.text} />
        <AppText color={palette.text} accessibilityRole="header" numberOfLines={1} style={styles.title}>
          {title}
        </AppText>
      </View>
      {onSeeAll && seeAllLabel ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`${title}: ${seeAllLabel}`}
          hitSlop={8}
          onPress={() => {
            haptics.light();
            onSeeAll();
          }}
          style={styles.seeAll}
        >
          <AppText color={palette.textSecondary} style={styles.seeAllText}>
            {seeAllLabel}
          </AppText>
          <Ionicons name="arrow-forward" size={15} color={palette.textSecondary} />
        </PressableScale>
      ) : null}
    </View>
  );
}

interface RailCardProps extends Omit<Shortcut, 'key'> {
  id: string;
  index: number;
  look: Appearance;
  /** Reduced motion: no drum, float, light or entrance; the press only sinks. */
  still: boolean;
  /** The shared loop, 0 to 1. */
  clock: SharedValue<number>;
  scrollX: SharedValue<number>;
  span: SharedValue<number>;
}

function RailCard({ id, index, look, still, clock, scrollX, span, label, art, image, onPress }: RailCardProps) {
  const body = BODY[look];
  const accent = ACCENTS[id] ?? ACCENTS.words;
  const glow = rgba(accent, body.glow);
  const press = useSharedValue(0);
  const tipX = useSharedValue(0);
  const tipY = useSharedValue(0);
  const entering = useMemo(() => (still ? undefined : entrance(index)), [index, still]);

  // The drum turn from the scroll position, plus the tip toward a pressing finger.
  const cardStyle = useAnimatedStyle(() => {
    let turn = 0;
    let size = 1;
    if (!still) {
      const { left, width } = onScreen(index, scrollX, span);
      const range = [-CARD_W / 2, PAD, width - PAD - CARD_W, width - CARD_W / 2];
      turn = interpolate(left, range, [-EDGE_TURN, 0, 0, EDGE_TURN], Extrapolation.CLAMP);
      size = interpolate(left, range, [EDGE_SCALE, 1, 1, EDGE_SCALE], Extrapolation.CLAMP);
    }
    const p = press.get();
    return {
      transform: [
        { perspective: PERSPECTIVE },
        { rotateY: `${turn + tipY.get() * p}deg` },
        { rotateX: `${tipX.get() * p}deg` },
        { scale: size * (1 - 0.05 * p) },
      ],
    };
  });

  const artStyle = useAnimatedStyle(() => {
    if (still) return { transform: [{ translateX: 0 }] };
    const { left, width } = onScreen(index, scrollX, span);
    const shift = (left - (width - CARD_W) / 2) * PARALLAX;
    return { transform: [{ translateX: Math.min(Math.max(shift, -PARALLAX_MAX), PARALLAX_MAX) }] };
  });

  // Floats and sways on the loop; a press pops it up out of the card.
  const objectStyle = useAnimatedStyle(() => {
    const t = clock.get();
    const p = press.get();
    const lift = still ? 0.5 : rise(t, index);
    const sway = still ? 0 : Math.sin(2 * Math.PI * (t + index * 0.23));
    return {
      transform: [
        { translateY: FLOAT / 2 - FLOAT * lift - 7 * p },
        { rotate: `${SWAY * sway - 9 * p}deg` },
        { scale: 1 + 0.14 * p },
      ],
    };
  });

  // Breathes with the float and flares as the light passes.
  const glowStyle = useAnimatedStyle(() => {
    const t = clock.get();
    const p = press.get();
    const lift = still ? 0.5 : rise(t, index);
    const flare = still ? 0 : bump(phase(t, index), 0.02, 0.26);
    return {
      opacity: Math.min(1, 0.7 + 0.2 * lift + 0.3 * flare + 0.3 * p),
      transform: [{ scale: 0.9 + 0.18 * lift + 0.16 * flare + 0.25 * p }],
    };
  });

  const shineStyle = useAnimatedStyle(() => {
    const p = Math.min(phase(clock.get(), index) / SHINE_SPAN, 1);
    const eased = p * p * (3 - 2 * p);
    return { transform: [{ translateX: SHINE_FROM + (SHINE_TO - SHINE_FROM) * eased }, { rotate: '20deg' }] };
  });

  const goStyle = useAnimatedStyle(() => {
    const nudge = still ? 0 : bump(phase(clock.get(), index), NUDGE_AT, NUDGE_SPAN);
    const p = press.get();
    const out = 3.5 * nudge + 3 * p;
    return { transform: [{ translateX: out }, { translateY: -out }, { scale: 1 + 0.12 * nudge + 0.14 * p }] };
  });

  const onPressIn = (event: GestureResponderEvent) => {
    if (!still) {
      // Children ignore touches, so the location is on the card itself. The pressed side sinks.
      const x = Math.min(Math.max(event.nativeEvent.locationX / CARD_W, 0), 1) - 0.5;
      const y = Math.min(Math.max(event.nativeEvent.locationY / CARD_H, 0), 1) - 0.5;
      tipY.set(x * 2 * TILT);
      tipX.set(-y * 2 * TILT);
    }
    press.set(withTiming(1, { duration: 120, easing: easing.out }));
  };

  // Released, it springs back past rest once (the overshoot) and settles.
  const onPressOut = () => {
    press.set(withTiming(0, { duration: 520, easing: easing.overshoot }));
  };

  return (
    // The entrance has its own wrapper: a layout animation's transform would fight the card's.
    <Animated.View entering={entering}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => {
          haptics.light();
          onPress();
        }}
        // The shadow lives on the outer box: iOS clips shadows on a view that clips its children.
        style={[styles.card, { boxShadow: body.shadow(accent) }, cardStyle]}
      >
        <View pointerEvents="none" style={[styles.inner, { borderColor: body.rim(accent) }]}>
          <LinearGradient
            colors={[mix(body.base, accent, body.top), mix(body.base, accent, body.bottom)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* The object floats in the upper part of the card, a little right of centre, on a soft glow. */}
          <Animated.View style={[styles.art, artStyle]}>
            <Animated.View style={[styles.glow, { backgroundColor: glow, boxShadow: `0 0 26px 14px ${glow}` }, glowStyle]} />
            <Animated.View style={objectStyle}>
              {image ? (
                <Image source={image} style={styles.image} contentFit="contain" transition={150} />
              ) : (
                <ShortcutArt name={art} size={ART - 18} />
              )}
            </Animated.View>
          </Animated.View>

          {still ? null : (
            <Animated.View style={[styles.shine, shineStyle]}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0)', body.shine, 'rgba(255, 255, 255, 0)']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          )}

          <View style={styles.foot}>
            <AppText color={body.label} numberOfLines={1} adjustsFontSizeToFit style={styles.label}>
              {label}
            </AppText>
            <Animated.View style={[styles.go, { backgroundColor: accent, boxShadow: `0 3px 8px ${rgba(accent, 0.4)}` }, goStyle]}>
              <Ionicons name="arrow-up" size={14} color="#FFFFFF" style={styles.goIcon} />
            </Animated.View>
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  headerTitle: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flexShrink: 1, fontSize: 18, lineHeight: 23, fontWeight: '800', letterSpacing: -0.2 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAllText: { fontSize: 14, lineHeight: 18, fontWeight: '600' },

  // Bleeds to the screen edges (the sheet pads by spacing.xl) so cards slide off the side cleanly.
  // The scroll view clips whatever leaves its frame, shadows included, which drew a hard band under
  // the cards. Padding gives the shadows room inside it; the negative margins keep the layout as is.
  rail: { marginHorizontal: -PAD, marginVertical: -SHADOW_ROOM, flexGrow: 0 },
  content: { gap: GAP, paddingHorizontal: PAD, paddingVertical: SHADOW_ROOM },
  card: { width: CARD_W, height: CARD_H, borderRadius: RADIUS },
  inner: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderRadius: RADIUS,
    borderWidth: 1,
    overflow: 'hidden',
  },
  art: {
    position: 'absolute',
    top: 0,
    right: 10,
    width: ART,
    height: ART,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: { position: 'absolute', width: ART * 0.5, height: ART * 0.5, borderRadius: ART },
  image: { width: ART, height: ART },
  // A soft diagonal band of light that sweeps across the card once per loop.
  shine: { position: 'absolute', top: -CARD_H * 0.3, left: 0, width: SHINE_W, height: CARD_H * 1.6 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { flex: 1, fontSize: 15, lineHeight: 19, fontWeight: '800', letterSpacing: -0.2 },
  go: { width: GO, height: GO, borderRadius: GO / 2, alignItems: 'center', justifyContent: 'center' },
  goIcon: { transform: [{ rotate: '45deg' }] },
});
