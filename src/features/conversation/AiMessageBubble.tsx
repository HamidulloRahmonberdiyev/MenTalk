import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { Pressable3D } from '@/components/ui/Pressable3D';
import { TappableText } from '@/features/vocabulary/TappableText';
import { useT } from '@/i18n';
import { colors, radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';
import type { AiMessage } from '@/types';

interface AiMessageBubbleProps {
  message: AiMessage | null;
  speaking: boolean;
  /** The tutor is preparing a reply and nothing of it has arrived yet. */
  thinking?: boolean;
  /** Plays the line again. */
  onReplay?: () => void;
  /** A word of the line was tapped (to translate and save it). */
  onWordPress?: (word: string) => void;
  /** Normalized forms of words the learner already saved. */
  savedWords?: ReadonlySet<string>;
  /** Show the "tap any word" tip. */
  showTip?: boolean;
}

const NO_WORDS: ReadonlySet<string> = new Set();
const SPEAKER = 52;
const TAIL = 20;

function TypingDot({ index }: { index: number }) {
  const lift = useSharedValue(0);
  useEffect(() => {
    lift.set(withDelay(index * 150, withRepeat(withSequence(withTiming(1, { duration: 300 }), withTiming(0, { duration: 300 })), -1)));
  }, [index, lift]);
  const style = useAnimatedStyle(() => ({ opacity: 0.35 + lift.get() * 0.65, transform: [{ translateY: -lift.get() * 4 }] }));
  return <Animated.View style={[styles.dot, style]} />;
}

/** Shown in place of the text until the first words of the reply arrive. */
function TypingDots() {
  return (
    <View style={styles.dots} accessibilityElementsHidden>
      {[0, 1, 2].map((index) => (
        <TypingDot key={index} index={index} />
      ))}
    </View>
  );
}

/** A blinking bar at the end of a line that is still being written. */
function Caret() {
  const blink = useSharedValue(1);
  useEffect(() => {
    blink.set(withRepeat(withTiming(0, { duration: 500, easing: Easing.steps(2) }), -1, true));
  }, [blink]);
  const style = useAnimatedStyle(() => ({ opacity: blink.get() }));
  return <Animated.View style={[styles.caret, style]} />;
}

/** The tutor's line on a chunky card whose tail points up at the tutor. */
export function AiMessageBubble({ message, speaking, thinking = false, onReplay, onWordPress, savedWords = NO_WORDS, showTip = false }: AiMessageBubbleProps) {
  const home = usePalette();
  const themed = useThemedStyles(createStyles);
  const t = useT();
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.set(speaking ? withRepeat(withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }), -1) : withTiming(0, { duration: 200 }));
  }, [speaking, pulse]);
  const ring = useAnimatedStyle(() => ({ opacity: speaking ? 0.45 * (1 - pulse.get()) : 0, transform: [{ scale: 1 + pulse.get() * 0.5 }] }));

  const streaming = message?.streaming === true;
  // A new reply that is still being prepared replaces the old line with the typing dots.
  const waiting = thinking && (!message || !streaming);

  return (
    <Animated.View
      key={message?.id ?? 'placeholder'}
      entering={FadeInDown.duration(320)}
      exiting={FadeOut.duration(120)}
      style={themed.wrap}
      accessibilityLiveRegion="polite"
    >
      <View style={themed.card}>
        <View style={themed.body}>
          {waiting ? (
            <TypingDots />
          ) : message && !streaming && onWordPress ? (
            <TappableText variant="subheading" style={themed.text} text={message.text} savedWords={savedWords} onWordPress={onWordPress} />
          ) : (
            <View style={styles.streamRow}>
              <AppText variant="subheading" style={themed.text}>
                {message?.text ?? '…'}
                {streaming ? ' ' : ''}
              </AppText>
              {streaming ? <Caret /> : null}
            </View>
          )}
          {showTip && message && !streaming && !waiting && onWordPress ? (
            <Animated.View entering={FadeIn.duration(200)}>
              <AppText variant="caption" color={home.textMuted}>
                {t('word.tip')}
              </AppText>
            </Animated.View>
          ) : null}
        </View>

        <View style={styles.speakerWrap}>
          <Animated.View pointerEvents="none" style={[styles.ring, ring]} />
          <Pressable3D
            accessibilityRole="button"
            accessibilityLabel={t('conversation.replay')}
            disabled={!message || streaming || waiting}
            onPress={onReplay}
            edgeColor="#1A84BF"
            depth={4}
            radius={SPEAKER / 2}
            style={[styles.speaker, (!message || streaming || waiting) && styles.speakerOff]}
            faceStyle={styles.speakerFace}
          >
            <Ionicons name={speaking ? 'volume-high' : 'volume-medium'} size={24} color={colors.onPrimary} />
          </Pressable3D>
        </View>
      </View>
      {/* Drawn over the card's top border, so the rim runs around the tail without a seam. */}
      <View style={themed.tail} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  streamRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' },
  caret: { width: 3, height: 20, marginBottom: 3, borderRadius: 2, backgroundColor: colors.primary },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 28 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
  speakerWrap: { width: SPEAKER, height: SPEAKER + 4, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', top: 0, width: SPEAKER, height: SPEAKER, borderRadius: radii.pill, backgroundColor: colors.primary },
  speaker: { width: SPEAKER, height: SPEAKER + 4 },
  speakerOff: { opacity: 0.5 },
  speakerFace: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
});

const createStyles = (home: Palette) =>
  StyleSheet.create({
    wrap: { paddingTop: TAIL / 2 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.lg,
      paddingLeft: spacing.xl,
      paddingRight: spacing.lg,
      borderRadius: radii.xl,
      backgroundColor: home.panel,
      borderWidth: 2,
      borderBottomWidth: 6,
      borderColor: home.rim,
      borderBottomColor: home.rimBottom,
      boxShadow: '0 10px 28px rgba(10, 40, 70, 0.12)',
    },
    tail: {
      position: 'absolute',
      top: 0,
      left: '50%',
      marginLeft: -TAIL / 2,
      width: TAIL,
      height: TAIL,
      borderTopLeftRadius: 5,
      backgroundColor: home.panel,
      borderTopWidth: 2,
      borderLeftWidth: 2,
      borderColor: home.rim,
      transform: [{ rotate: '45deg' }],
    },
    body: { flex: 1, gap: spacing.sm },
    text: { fontSize: 20, lineHeight: 28, fontWeight: '700', color: home.text },
  });
