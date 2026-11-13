import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { haptics } from '@/services/haptics';
import { spacing } from '@/theme';
import { usePalette, type Appearance } from '@/theme/appearance';

import { ShortcutArt } from './ShortcutArt';
import type { Shortcut } from './ShortcutGrid';

const CARD_W = 128;
const CARD_H = 110;
const GAP = spacing.md;
const STEP = CARD_W + GAP;
/** Space inside the scroll view for the cards' shadows to fade out before its edge. */
const SHADOW_ROOM = 24;
const RADIUS = 24;
const ART = 74;
/** How often the rail moves on by itself, and how long it waits after the learner swipes it. */
const AUTO_EVERY = 3500;
const AUTO_RESUME_AFTER = 7000;

/** Each shortcut's own accent: it tints the card, the glow behind the object, the arrow and the shadow. */
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

/** The card body per look: white on the white sheet, a lifted slate on the grey one. */
const BODY = {
  light: {
    base: '#FFFFFF',
    tint: 0.22,
    orb: 0.12,
    glow: 0.32,
    label: '#1C243C',
    rim: (accent: string) => rgba(accent, 0.2),
    shadow: (accent: string) => `0 6px 14px ${rgba(accent, 0.2)}`,
  },
  dark: {
    base: '#3A3F4C',
    tint: 0.34,
    orb: 0.16,
    glow: 0.48,
    label: '#F0F4FC',
    rim: () => 'rgba(255, 255, 255, 0.09)',
    shadow: () => '0 6px 14px rgba(0, 0, 0, 0.35)',
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

/**
 * The home shortcuts as a featured carousel of pastel cards that slides on by itself every few
 * seconds (paused while the learner swipes, off with reduced motion).
 */
export function ShortcutRail({ items }: { items: Shortcut[] }) {
  const look: Appearance = usePalette().appearance;
  const reduceMotion = useReducedMotion();
  const list = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const indexRef = useRef(0);
  const pausedUntil = useRef(0);
  // The last few cards fit on screen together, so the rail has fewer stops than cards.
  const visible = width ? Math.max(1, Math.floor((width - spacing.xl + GAP) / STEP)) : 1;
  const pages = Math.max(1, items.length - visible + 1);
  const pagesRef = useRef(pages);
  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  const goTo = useCallback((next: number) => {
    indexRef.current = next;
    list.current?.scrollTo({ x: next * STEP, animated: true });
  }, []);

  // Only ticks while the home tab is on screen.
  useFocusEffect(
    useCallback(() => {
      if (reduceMotion) return;
      const timer = setInterval(() => {
        if (Date.now() < pausedUntil.current || pagesRef.current < 2) return;
        goTo((indexRef.current + 1) % pagesRef.current);
      }, AUTO_EVERY);
      return () => clearInterval(timer);
    }, [goTo, reduceMotion]),
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
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width + spacing.xl * 2)}>
      <ScrollView
        ref={list}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={STEP}
        decelerationRate="fast"
        style={styles.rail}
        contentContainerStyle={styles.content}
        onScrollBeginDrag={() => {
          pausedUntil.current = Date.now() + AUTO_RESUME_AFTER;
        }}
        onMomentumScrollEnd={onSettle}
      >
        {items.map(({ key, ...item }) => (
          <RailCard key={key} id={key} look={look} {...item} />
        ))}
      </ScrollView>

    </View>
  );
}

function RailCard({
  id,
  look,
  label,
  art,
  image,
  onPress,
}: Omit<Shortcut, 'key'> & { id: string; look: Appearance }) {
  const body = BODY[look];
  const accent = ACCENTS[id] ?? ACCENTS.words;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      scaleTo={0.95}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      // The shadow lives on the outer box: iOS clips shadows on a view that clips its children.
      style={[styles.card, { boxShadow: body.shadow(accent) }]}
    >
      <View style={[styles.inner, { borderColor: body.rim(accent) }]}>
        <LinearGradient
          colors={[mix(body.base, accent, body.tint), body.base]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.8]}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={[styles.orb, { backgroundColor: rgba(accent, body.orb) }]} />

        <View pointerEvents="none" style={styles.art}>
          <View style={[styles.glow, { backgroundColor: rgba(accent, body.glow), boxShadow: `0 0 26px 14px ${rgba(accent, body.glow)}` }]} />
          {image ? (
            <Image source={image} style={styles.image} contentFit="contain" transition={150} />
          ) : (
            <ShortcutArt name={art} size={ART - 16} />
          )}
        </View>

        <View style={styles.foot}>
          <AppText color={body.label} numberOfLines={1} adjustsFontSizeToFit style={styles.label}>
            {label}
          </AppText>
          <View style={[styles.go, { backgroundColor: accent, boxShadow: `0 4px 10px ${rgba(accent, 0.45)}` }]}>
            <Ionicons name="arrow-up" size={15} color="#FFFFFF" style={styles.goIcon} />
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // Bleeds to the screen edges (the sheet pads by spacing.xl) so cards slide off the side cleanly;
  // the bottom padding leaves room for the soft shadows.
  // The scroll view clips whatever leaves its frame, shadows included, which drew a hard band under
  // the cards. Padding gives the shadows room inside it; the negative margins keep the layout as is.
  rail: { marginHorizontal: -spacing.xl, marginVertical: -SHADOW_ROOM, flexGrow: 0 },
  content: { gap: GAP, paddingHorizontal: spacing.xl, paddingVertical: SHADOW_ROOM },
  card: { width: CARD_W, height: CARD_H, borderRadius: RADIUS },
  inner: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.md,
    borderRadius: RADIUS,
    borderWidth: 1,
    overflow: 'hidden',
  },
  orb: { position: 'absolute', width: 120, height: 120, top: -50, right: -40, borderRadius: 60 },
  // The object sits up in the top-right, tilted a little, clear of the label and arrow below.
  art: {
    position: 'absolute',
    top: 0,
    right: 2,
    width: ART,
    height: ART,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-8deg' }],
  },
  glow: { position: 'absolute', width: ART * 0.55, height: ART * 0.55, borderRadius: ART },
  image: { width: ART, height: ART },
  foot: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { flex: 1, fontSize: 16, lineHeight: 20, fontWeight: '900', letterSpacing: -0.3 },
  go: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  goIcon: { transform: [{ rotate: '45deg' }] },
});
