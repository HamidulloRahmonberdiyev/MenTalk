import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { useSettingsStore } from '@/store/settingsStore';
import { colors, radii, spacing } from '@/theme';
import type { IconName } from '@/types';

import { DEMO_SCAN } from './scanDemo';
import { ScanPage, type ScanPhase } from './ScanPage';
import { ScanReviewSheet } from './ScanReviewSheet';
import { ScanSaved } from './ScanSaved';

const scan = DEMO_SCAN;
const freshIds = () => new Set(scan.words.filter((word) => !word.known).map((word) => word.id));
/** Long enough for every word on the page to light up, plus a beat to take it in. */
const SCAN_MS = 600 + scan.words.length * 140 + 700;

/**
 * Words from a photo: point the camera at a book or dictionary page, and the words found on it come
 * back translated, ready to save to the word list. Static for now: the "photo" is a demo page and
 * the result comes from `scanDemo`, so the flow can be seen end to end before OCR is wired in.
 */
export function ScanScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { height: screen } = useWindowDimensions();
  const language = useSettingsStore((state) => state.language);
  const [phase, setPhase] = useState<ScanPhase>('camera');
  const [flash, setFlash] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(freshIds);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const shot = useSharedValue(0);
  const lift = useSharedValue(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    const up = phase === 'review' || phase === 'saved';
    lift.set(withSpring(up ? 1 : 0, { damping: 18, stiffness: 140 }));
  }, [phase, lift]);

  const capture = useCallback(() => {
    haptics.medium();
    shot.set(withSequence(withTiming(1, { duration: 60 }), withTiming(0, { duration: 420 })));
    setPhase('scanning');
    timer.current = setTimeout(() => {
      haptics.success();
      setPhase('review');
    }, SCAN_MS);
  }, [shot]);

  const retake = useCallback(() => {
    clearTimeout(timer.current);
    haptics.light();
    setSelected(freshIds());
    setPhase('camera');
  }, []);

  const toggle = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((current) => {
      const all = freshIds();
      return [...all].every((id) => current.has(id)) ? new Set() : all;
    });
  }, []);

  const save = useCallback(() => {
    haptics.success();
    setPhase('saved');
  }, []);

  const flashStyle = useAnimatedStyle(() => ({ opacity: shot.get() * 0.85 }));
  // The page slides up and shrinks to make room for the sheet, like a lens result.
  const pageStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -lift.get() * screen * 0.2 }, { scale: 1 - lift.get() * 0.22 }],
  }));

  const saved = scan.words.filter((word) => selected.has(word.id));
  const scanning = phase === 'scanning';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {/* A dim, warm room behind the page, as a camera would see it. */}
      <LinearGradient colors={['#23262E', '#14161B', '#0B0C10']} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.lamp} />

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <GlassButton icon="close" label={t('scan.close')} onPress={() => router.back()} />
        <AppText color="#FFFFFF" style={styles.topTitle} numberOfLines={1}>
          {t('scan.title')}
        </AppText>
        <GlassButton
          icon={flash ? 'flash' : 'flash-off'}
          label={t('scan.flash')}
          active={flash}
          onPress={() => {
            haptics.selection();
            setFlash((on) => !on);
          }}
        />
      </View>

      <View style={styles.stage}>
        {phase === 'camera' && (
          <Animated.View entering={FadeInDown.duration(300)} exiting={FadeOut.duration(150)} style={styles.hint}>
            <Ionicons name="book-outline" size={15} color="#FFFFFF" />
            <AppText color="#FFFFFF" style={styles.hintText}>
              {t('scan.hint')}
            </AppText>
          </Animated.View>
        )}
        {scanning && (
          <Animated.View entering={FadeInDown.duration(250)} exiting={FadeOut.duration(150)} style={[styles.hint, styles.hintScanning]}>
            <PulseDot />
            <AppText color="#FFFFFF" style={styles.hintText}>
              {t('scan.scanning')}
            </AppText>
          </Animated.View>
        )}

        <Animated.View style={[styles.frame, pageStyle]}>
          <Corners active={scanning} />
          <ScanPage scan={scan} phase={phase} selected={selected} onToggle={toggle} />
        </Animated.View>
      </View>

      {phase === 'camera' && (
        <Animated.View
          entering={FadeIn.duration(250)}
          exiting={FadeOutDown.duration(200)}
          style={[styles.controls, { paddingBottom: insets.bottom + spacing.xl }]}
        >
          <SideButton icon="images-outline" label={t('scan.gallery')} onPress={capture} />
          <Shutter label={t('scan.shoot')} onPress={capture} />
          <SideButton icon="text-outline" label={t('scan.tip')} onPress={() => haptics.selection()} />
        </Animated.View>
      )}

      {phase === 'review' && (
        <Animated.View entering={SlideInDown.springify().damping(20).stiffness(160)} style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <ScanReviewSheet
            words={scan.words}
            selected={selected}
            language={language}
            onToggle={toggle}
            onToggleAll={toggleAll}
            onRetake={retake}
            onSave={save}
          />
        </Animated.View>
      )}

      {phase === 'saved' && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <ScanSaved words={saved} onOpenWords={() => router.navigate('/words')} onAgain={retake} />
        </View>
      )}

      <Animated.View pointerEvents="none" style={[styles.flash, flashStyle]} />
    </View>
  );
}

function GlassButton({ icon, label, active, onPress }: { icon: IconName; label: string; active?: boolean; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      hitSlop={8}
      scaleTo={0.9}
      onPress={onPress}
      style={[styles.glass, active && styles.glassActive]}
    >
      <Ionicons name={icon} size={20} color={active ? '#1B1300' : '#FFFFFF'} />
    </PressableScale>
  );
}

function SideButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} scaleTo={0.9} onPress={onPress} style={styles.side}>
      <View style={styles.sideIcon}>
        <Ionicons name={icon} size={22} color="#FFFFFF" />
      </View>
      <AppText color="rgba(255,255,255,0.75)" style={styles.sideText} numberOfLines={1}>
        {label}
      </AppText>
    </PressableScale>
  );
}

/** The camera shutter: a white disc in a ring that sinks a little when pressed. */
function Shutter({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} scaleTo={0.88} onPress={onPress} style={styles.shutterRing}>
      <LinearGradient colors={['#FFFFFF', '#E6ECF2']} style={styles.shutter}>
        <Ionicons name="scan" size={28} color={colors.primary} />
      </LinearGradient>
    </PressableScale>
  );
}

/** Viewfinder brackets at the page's four corners; they turn blue while the page is read. */
function Corners({ active }: { active: boolean }) {
  const color = active ? '#5CC8FA' : '#FFFFFF';
  return (
    <View pointerEvents="none" style={styles.corners}>
      <View style={[styles.corner, styles.tl, { borderColor: color }]} />
      <View style={[styles.corner, styles.tr, { borderColor: color }]} />
      <View style={[styles.corner, styles.bl, { borderColor: color }]} />
      <View style={[styles.corner, styles.br, { borderColor: color }]} />
    </View>
  );
}

function PulseDot() {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(1, { duration: 700 }), -1, true));
    return () => cancelAnimation(pulse);
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ opacity: 0.4 + pulse.get() * 0.6, transform: [{ scale: 0.8 + pulse.get() * 0.3 }] }));
  return <Animated.View style={[styles.pulse, style]} />;
}

const CORNER = 26;
const SHUTTER = 74;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0C10' },
  lamp: {
    position: 'absolute',
    top: -120,
    alignSelf: 'center',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(255, 220, 160, 0.06)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
    zIndex: 2,
  },
  topTitle: { flex: 1, textAlign: 'center', fontSize: 17, lineHeight: 22, fontWeight: '800' },
  glass: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  glassActive: { backgroundColor: '#FFD43B', borderColor: '#FFE47A' },
  stage: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xxl + 4, gap: spacing.xl },
  hint: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  hintScanning: { backgroundColor: 'rgba(42,171,238,0.25)', borderColor: 'rgba(92,200,250,0.45)' },
  hintText: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  pulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#7FD4FF' },
  frame: {},
  corners: { position: 'absolute', top: -14, left: -14, right: -14, bottom: -14, zIndex: 1 },
  corner: { position: 'absolute', width: CORNER, height: CORNER },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 12 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 12 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 12 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 12 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  side: { width: 76, alignItems: 'center', gap: 6 },
  sideIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  sideText: { fontSize: 11, lineHeight: 14, fontWeight: '700' },
  shutterRing: {
    width: SHUTTER + 14,
    height: SHUTTER + 14,
    borderRadius: (SHUTTER + 14) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  shutter: {
    width: SHUTTER,
    height: SHUTTER,
    borderRadius: SHUTTER / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flash: { ...StyleSheet.absoluteFill, backgroundColor: '#FFFFFF' },
});
