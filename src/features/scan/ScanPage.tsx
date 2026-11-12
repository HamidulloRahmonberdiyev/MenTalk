import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { colors } from '@/theme';

import { tokenKey, type ScanResult, type ScannedWord } from './scanDemo';

export type ScanPhase = 'camera' | 'scanning' | 'review' | 'saved';

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const INK = '#2B2620';
/** Highlighter yellow while scanning; blue for picked words, green for known ones afterwards. */
const MARK = {
  scan: 'rgba(255, 210, 40, 0.55)',
  picked: 'rgba(42, 171, 238, 0.24)',
  pickedLine: colors.primary,
  known: 'rgba(34, 181, 115, 0.18)',
  knownLine: 'rgba(34, 181, 115, 0.7)',
  idle: 'rgba(43, 38, 32, 0.07)',
};

interface ScanPageProps {
  scan: ScanResult;
  phase: ScanPhase;
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
}

/**
 * The photographed book page: warm paper, serif type, a fold shadow. While scanning, a light sweeps
 * down and the found words light up one by one like a highlighter; once reviewed, tapping a word on
 * the page picks it, mirroring the list below.
 */
export function ScanPage({ scan, phase, selected, onToggle }: ScanPageProps) {
  const byKey = useMemo(() => new Map(scan.words.map((word, order) => [word.surface, { word, order }])), [scan.words]);
  const height = useSharedValue(0);

  return (
    <View
      style={styles.page}
      onLayout={(event) => height.set(event.nativeEvent.layout.height)}
      accessibilityRole="image"
    >
      <LinearGradient colors={['#FCF8EF', '#F3EBDA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {/* The spine side of an open book falls into shade. */}
      <LinearGradient
        colors={['rgba(60,40,20,0.16)', 'rgba(60,40,20,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.fold}
      />

      <AppText color="#8A7B66" style={styles.chapter}>
        {scan.title.toUpperCase()}
      </AppText>

      {scan.paragraphs.map((paragraph, index) => (
        <View key={index} style={[styles.paragraph, index > 0 && styles.indent]}>
          {paragraph.split(' ').map((token, position) => {
            const hit = byKey.get(tokenKey(token));
            return hit ? (
              <PageWord
                key={position}
                token={token}
                word={hit.word}
                order={hit.order}
                phase={phase}
                picked={selected.has(hit.word.id)}
                onToggle={onToggle}
              />
            ) : (
              <AppText key={position} color={INK} style={styles.word}>
                {token}
              </AppText>
            );
          })}
        </View>
      ))}

      <AppText color="#A89880" style={styles.pageNumber}>
        {scan.pageNumber}
      </AppText>

      {phase === 'scanning' && <ScanSweep height={height} />}
    </View>
  );
}

interface PageWordProps {
  token: string;
  word: ScannedWord;
  order: number;
  phase: ScanPhase;
  picked: boolean;
  onToggle: (id: string) => void;
}

const PageWord = memo(function PageWord({ token, word, order, phase, picked, onToggle }: PageWordProps) {
  const found = useSharedValue(0);
  const settled = useSharedValue(0);

  useEffect(() => {
    if (phase === 'camera') {
      found.set(0);
      settled.set(0);
    } else if (phase === 'scanning') {
      found.set(withDelay(350 + order * 140, withTiming(1, { duration: 260 })));
    } else {
      found.set(1);
      settled.set(withTiming(1, { duration: 300 }));
    }
  }, [phase, order, found, settled]);

  const after = word.known ? MARK.known : picked ? MARK.picked : MARK.idle;
  const line = word.known ? MARK.knownLine : picked ? MARK.pickedLine : 'transparent';

  const mark = useAnimatedStyle(() => ({
    opacity: found.get(),
    transform: [{ scaleX: 0.6 + 0.4 * found.get() }],
    backgroundColor: interpolateColor(settled.get(), [0, 1], [MARK.scan, after]),
    borderBottomColor: settled.get() > 0.5 ? line : 'transparent',
  }));

  const interactive = phase === 'review' && !word.known;

  return (
    <Pressable
      disabled={!interactive}
      onPress={() => onToggle(word.id)}
      hitSlop={4}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: picked, disabled: !interactive }}
      accessibilityLabel={word.lemma}
    >
      <Animated.View pointerEvents="none" style={[styles.mark, mark]} />
      <AppText color={INK} style={[styles.word, styles.found]}>
        {token}
      </AppText>
    </Pressable>
  );
});

/** A band of light sweeping down the page, top to bottom, again and again. */
function ScanSweep({ height }: { height: SharedValue<number> }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }), -1, false));
    return () => cancelAnimation(progress);
  }, [progress]);

  const sweep = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.get() * height.get() - SWEEP }],
    opacity: progress.get() < 0.05 ? progress.get() * 20 : progress.get() > 0.92 ? (1 - progress.get()) * 12 : 1,
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.sweep, sweep]}>
      <LinearGradient colors={['rgba(42,171,238,0)', 'rgba(42,171,238,0.28)']} style={StyleSheet.absoluteFill} />
      <View style={styles.sweepLine} />
    </Animated.View>
  );
}

const SWEEP = 90;

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 16,
    borderRadius: 6,
    overflow: 'hidden',
    boxShadow: '0 18px 40px rgba(0, 0, 0, 0.45)',
    transform: [{ rotate: '-1.2deg' }],
  },
  fold: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 26 },
  chapter: { fontFamily: SERIF, fontSize: 11, lineHeight: 14, letterSpacing: 2.4, textAlign: 'center', marginBottom: 14 },
  paragraph: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 4.5, rowGap: 2 },
  indent: { marginTop: 10 },
  word: { fontFamily: SERIF, fontSize: 15, lineHeight: 23 },
  found: { paddingHorizontal: 1 },
  mark: {
    position: 'absolute',
    left: -2,
    right: -2,
    top: 3,
    bottom: 1,
    borderRadius: 4,
    borderBottomWidth: 2,
  },
  pageNumber: { fontFamily: SERIF, fontSize: 11, lineHeight: 14, textAlign: 'center', marginTop: 14 },
  sweep: { position: 'absolute', left: 0, right: 0, top: 0, height: SWEEP },
  sweepLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: '#7FD4FF',
    boxShadow: '0 0 12px rgba(42, 171, 238, 0.9)',
  },
});
