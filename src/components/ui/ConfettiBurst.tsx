import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

/** The app's bright family: gold, amber, lime, green, sky, blue, pink, purple and coral. */
const COLORS = ['#FFD447', '#FFB020', '#89E219', '#58CC02', '#1CB0F6', '#4FC3FF', '#FF86C8', '#CE82FF', '#FF6B6B'] as const;
/**
 * Air drag (1/s) and gravity (px/s²): a fast burst that slows down, then a soft flutter at ~150 px/s.
 * Tuned in a simulation so ~90 pieces stay spread over every part of the screen for about 4 s.
 */
const DRAG = 2.8;
const GRAVITY = 420;
const TERMINAL = GRAVITY / DRAG;
/** Narrows the burst sideways, so fewer pieces leave the screen at once. */
const SIDEWAYS = 0.75;
const BURST_PIECES = 72;
const CANNON_PIECES = 22;
const RAIN_PIECES = 30;
const LIFE: readonly [number, number] = [3600, 4800];
/** The latest start (the rain) plus the longest life. */
const RUN_MS = 1100 + LIFE[1] + 100;

interface Piece {
  x0: number;
  y0: number;
  /** Launch velocity, px/s. */
  vx: number;
  vy: number;
  width: number;
  height: number;
  radius: number;
  color: string;
  /** Turn in the plane, deg/s. */
  spin: number;
  /** Flip around the long side (the paper-in-the-air flutter), rad/s. */
  flip: number;
  phase: number;
  /** Side-to-side drift while falling, px, and how fast, rad/s. */
  sway: number;
  swayRate: number;
  /** After the burst starts, ms. */
  delay: number;
  /** Until fully faded, ms. */
  life: number;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

/** Ribbons most of all, then squares, dots and thin streamers. */
function shape(): Pick<Piece, 'width' | 'height' | 'radius'> {
  const kind = pick(['ribbon', 'ribbon', 'ribbon', 'square', 'dot', 'streamer'] as const);
  if (kind === 'square') {
    const side = rand(7, 10);
    return { width: side, height: side, radius: 2 };
  }
  if (kind === 'dot') {
    const side = rand(6, 9);
    return { width: side, height: side, radius: side / 2 };
  }
  if (kind === 'streamer') return { width: 3.5, height: rand(18, 26), radius: 2 };
  return { width: rand(6, 9), height: rand(12, 18), radius: 2 };
}

function piece(x0: number, y0: number, angle: number, speed: number, delay: number): Piece {
  return {
    x0,
    y0,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    ...shape(),
    color: pick(COLORS),
    spin: rand(-540, 540),
    flip: rand(5, 11),
    phase: rand(0, Math.PI * 2),
    sway: rand(10, 28),
    swayRate: rand(2.5, 5),
    delay,
    life: rand(LIFE[0], LIFE[1]),
  };
}

/**
 * An explosion all round the origin (leaning a little upwards), a cannon from each bottom corner, and
 * a gentle rain from above the top edge, so the whole screen fills with confetti.
 */
function makePieces(origin: { x: number; y: number }, width: number, height: number): Piece[] {
  const burst = Array.from({ length: BURST_PIECES }, (_, index) => {
    const angle = (index / BURST_PIECES) * Math.PI * 2 + rand(-0.2, 0.2);
    const launched = piece(origin.x, origin.y, angle, rand(350, 1300), rand(0, 70));
    return { ...launched, vx: launched.vx * SIDEWAYS, vy: launched.vy - rand(0, 220) };
  });
  const cannon = (fromLeft: boolean) =>
    Array.from({ length: CANNON_PIECES }, () => {
      const base = fromLeft ? -Math.PI / 3 : (-Math.PI * 2) / 3;
      return piece(fromLeft ? -8 : width + 8, height + 8, base + rand(-0.32, 0.32), rand(1600, 2400), 220 + rand(0, 170));
    });
  const rain = Array.from({ length: RAIN_PIECES }, () => ({
    ...piece(rand(0, width), rand(-140, -20), Math.PI / 2, 0, rand(250, 1100)),
    vx: rand(-60, 60),
    vy: rand(0, 120),
  }));
  return [...burst, ...cannon(true), ...cannon(false), ...rain];
}

interface ConfettiBurstProps {
  /** Where the main burst explodes from, in screen points. */
  origin: { x: number; y: number };
  /** Wait before the burst, e.g. for a cup to land first. */
  delay?: number;
}

/**
 * Full-screen confetti that fires once on mount: a burst from `origin` that scatters all over the
 * screen and two side cannons, then it removes itself. Off when the system asks for reduced motion.
 * Taps go through it. Give it a new `key` to fire again.
 */
export function ConfettiBurst({ origin, delay = 0 }: ConfettiBurstProps) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const clock = useSharedValue(0);
  const [running, setRunning] = useState(true);
  // Laid out once per mount, so a re-render never reshuffles pieces in flight.
  const [pieces] = useState(() => makePieces(origin, width, height));

  useEffect(() => {
    if (reduceMotion) return;
    clock.set(withDelay(delay, withTiming(RUN_MS, { duration: RUN_MS, easing: Easing.linear })));
    const timer = setTimeout(() => setRunning(false), delay + RUN_MS + 100);
    return () => {
      clearTimeout(timer);
      cancelAnimation(clock);
    };
  }, [clock, delay, reduceMotion]);

  if (reduceMotion || !running) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {pieces.map((item, index) => (
        <Particle key={index} piece={item} clock={clock} />
      ))}
    </View>
  );
}

/** One piece, placed on the UI thread from the shared clock: drag, gravity, sway, spin and flutter. */
function Particle({ piece: item, clock }: { piece: Piece; clock: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const ms = clock.get() - item.delay;
    if (ms <= 0) return { opacity: 0 };
    const t = ms / 1000;
    const travelled = (1 - Math.exp(-DRAG * t)) / DRAG;
    const x = item.x0 + item.vx * travelled + item.sway * Math.sin(item.swayRate * t + item.phase) * Math.min(t, 1);
    const y = item.y0 + TERMINAL * t + (item.vy - TERMINAL) * travelled;
    const fadeFrom = item.life * 0.72;
    const opacity = ms < fadeFrom ? 1 : Math.max(0, 1 - (ms - fadeFrom) / (item.life - fadeFrom));
    // Pops from small to full size in the first moments of the burst.
    const pop = Math.min(1, 0.3 + t * 7);
    return {
      opacity,
      transform: [
        { translateX: x - item.width / 2 },
        { translateY: y - item.height / 2 },
        { rotate: `${item.spin * t}deg` },
        { scaleX: pop },
        { scaleY: pop * Math.cos(item.flip * t + item.phase) },
      ],
    };
  });

  return (
    <Animated.View
      style={[styles.piece, { width: item.width, height: item.height, borderRadius: item.radius, backgroundColor: item.color }, style]}
    />
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', left: 0, top: 0 },
});
