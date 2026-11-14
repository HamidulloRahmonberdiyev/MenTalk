import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { FireIcon } from '@/components/ui/FireIcon';
import { Pressable3D } from '@/components/ui/Pressable3D';
import { useT } from '@/i18n';
import { radii, spacing } from '@/theme';
import { enter } from '@/theme/motion';

/**
 * The same face as the word-game card on the book tab (bright blue, raised on a darker edge, the 3D
 * game pad), so the card the learner tapped opens onto a page that starts with it.
 */
const RADIUS = 34;
const DEPTH = 6;
const FACE = ['#3EC0FF', '#1A9DF2'] as const;
const EDGE = '#0E7FD0';
/** Deep blue for the stat pills and the play label, as on the dictionary card's pill. */
const DEEP = '#0A78C8';
/** The light lip under the white play button. */
const BUTTON_EDGE = '#B5DDF7';
const GOLD = '#FFD447';
const GAME_ART = require('@/assets/icons3d/shortcuts/game.png');
const ART = 104;

interface WordsHeroProps {
  total: number;
  due: number;
  streak: number;
  xp: number;
  onPlay: () => void;
}

/** The word game's banner over the list: what is waiting today, the streak and XP, and the play button. */
export function WordsHero({ total, due, streak, xp, onPlay }: WordsHeroProps) {
  const t = useT();
  const empty = total === 0;
  const hint = empty ? t('words.empty.title') : due > 0 ? t('words.due', { n: due }) : t('words.bonus');

  return (
    <Animated.View entering={enter.rise()} style={styles.wrap}>
      {/* The darker edge peeking out under the face, as on the home cards. */}
      <View style={styles.edge} />
      <LinearGradient colors={FACE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        {/* Quiet light shapes for depth. */}
        <View pointerEvents="none" style={[styles.orb, styles.orbA]} />
        <View pointerEvents="none" style={[styles.orb, styles.orbB]} />

        <View style={styles.head}>
          <View style={styles.texts}>
            <AppText color="#FFFFFF" numberOfLines={1} adjustsFontSizeToFit style={styles.title} accessibilityRole="header">
              {t('words.round')}
            </AppText>
            <AppText color="rgba(255, 255, 255, 0.95)" numberOfLines={2} style={styles.subtitle}>
              {hint}
            </AppText>
          </View>
          {/* The 3D game pad: a soft halo behind it, a shadow pooled under its base. */}
          <View style={styles.art} pointerEvents="none">
            <View style={styles.halo} />
            <View style={styles.floor} />
            <Image source={GAME_ART} style={styles.artImage} contentFit="contain" transition={150} />
          </View>
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <FireIcon size={14} animated={streak > 0} />
            <AppText color="#FFFFFF" numberOfLines={1} style={styles.statText}>
              {t('words.streak', { n: streak })}
            </AppText>
          </View>
          <View style={styles.stat}>
            <Ionicons name="flash" size={15} color={GOLD} />
            <AppText color="#FFFFFF" numberOfLines={1} style={styles.statText}>
              {t('words.xp', { n: xp })}
            </AppText>
          </View>
        </View>

        <Pressable3D
          accessibilityRole="button"
          accessibilityLabel={t('words.play')}
          accessibilityState={{ disabled: empty }}
          disabled={empty}
          onPress={onPlay}
          edgeColor={BUTTON_EDGE}
          depth={5}
          radius={radii.lg}
          style={[styles.play, empty && styles.playOff]}
          faceStyle={styles.playFace}
        >
          <Ionicons name="play" size={20} color={DEEP} />
          <AppText color={DEEP} style={styles.playText}>
            {t('words.play')}
          </AppText>
        </Pressable3D>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: DEPTH, borderRadius: RADIUS },
  edge: {
    position: 'absolute',
    top: DEPTH,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: RADIUS,
    backgroundColor: EDGE,
  },
  card: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.lg,
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  orb: { position: 'absolute', borderRadius: 999 },
  orbA: { width: 190, height: 190, top: -80, right: -40, backgroundColor: 'rgba(255, 255, 255, 0.16)' },
  orbB: { width: 120, height: 120, bottom: -56, left: -40, backgroundColor: 'rgba(255, 255, 255, 0.1)' },

  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  texts: { flex: 1, gap: spacing.xs, paddingTop: spacing.xs },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { fontSize: 14, lineHeight: 19, fontWeight: '800' },
  // Taller than the texts beside it; the negative margins keep the head from growing.
  art: {
    width: ART,
    height: ART,
    marginVertical: -spacing.sm,
    marginRight: -spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-8deg' }],
  },
  halo: {
    position: 'absolute',
    width: ART * 0.74,
    height: ART * 0.74,
    borderRadius: ART,
    backgroundColor: 'rgba(255, 255, 255, 0.26)',
    boxShadow: '0 0 28px 10px rgba(255, 255, 255, 0.32)',
  },
  floor: {
    position: 'absolute',
    bottom: '10%',
    width: ART * 0.5,
    height: 9,
    borderRadius: ART,
    backgroundColor: 'rgba(10, 50, 110, 0.22)',
    boxShadow: '0 0 10px 4px rgba(10, 50, 110, 0.16)',
  },
  artImage: { width: ART, height: ART },

  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: DEEP,
    boxShadow: '0 3px 8px rgba(10, 50, 110, 0.22)',
  },
  statText: { fontSize: 13, lineHeight: 18, fontWeight: '800' },

  play: { height: 58 },
  // White on the blue card in both looks.
  playFace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFFFFF',
  },
  playText: { fontSize: 17, lineHeight: 22, fontWeight: '900', letterSpacing: 0.3 },
  playOff: { opacity: 0.55 },
});
