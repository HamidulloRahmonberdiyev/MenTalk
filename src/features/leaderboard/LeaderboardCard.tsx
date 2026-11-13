import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Pressable3D } from '@/components/ui/Pressable3D';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { useUserStore } from '@/store/userStore';
import { radii, spacing } from '@/theme';

import { LeaderFace } from './LeaderFace';
import { useLeaderboard } from './useLeaderboard';

const RADIUS = 40;
const FACE = '#FFB06A';
const EDGE = '#F68A1E';
const ROW = '#FF8A1F';
const INK = '#2A0F5C';
const MINI = 50;
/** Faces that fit beside the title on a phone. */
const SHOWN = 4;

/** Leaderboard on the home sheet: this week's top learners, then the learner's own row. Opens the full board. */
export function LeaderboardCard() {
  const t = useT();
  const name = useUserStore((state) => state.name);
  const avatarUrl = useUserStore((state) => state.avatarUrl);
  const { board } = useLeaderboard('week', SHOWN);
  const top = board?.top ?? [];
  const xp = board?.me.xp ?? 0;

  return (
    <Pressable3D
      accessibilityRole="button"
      accessibilityLabel={`${t('home.leaderboard.title')}. ${name}: ${xp} XP`}
      onPress={() => {
        haptics.light();
        router.push('/leaderboard');
      }}
      edgeColor={EDGE}
      depth={8}
      radius={RADIUS}
    >
      <View style={styles.card}>
        <View style={styles.head}>
          <View style={styles.titlePill}>
            <AppText color={INK} numberOfLines={2} adjustsFontSizeToFit style={styles.title}>
              {t('home.leaderboard.title')}
            </AppText>
          </View>

          <View style={styles.faces} pointerEvents="none">
            {top.length === 0 && board ? (
              <AppText color={INK} numberOfLines={2} style={styles.first}>
                {t('home.leaderboard.first')}
              </AppText>
            ) : (
              top.map((entry, index) => (
                <View key={entry.rank} style={[styles.mini, index > 0 && styles.miniOverlap, { zIndex: index }]}>
                  <View style={styles.miniRing}>
                    <LeaderFace uri={entry.avatar_url} size={MINI} />
                  </View>
                  <View style={styles.miniBadge}>
                    <AppText color={INK} numberOfLines={1} style={styles.miniPoints}>
                      {entry.xp}
                    </AppText>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={styles.arrow}>
            <Ionicons name="arrow-up" size={26} color={INK} style={styles.arrowIcon} />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.meRing}>
            <LeaderFace uri={avatarUrl} size={56} />
          </View>
          <AppText color="#FFFFFF" numberOfLines={1} style={styles.name}>
            {name}
          </AppText>
          <View style={styles.pointsPill}>
            <Ionicons name="flash" size={22} color={INK} />
            <AppText color={INK} style={styles.points}>
              {xp}
            </AppText>
          </View>
        </View>
      </View>
    </Pressable3D>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: RADIUS,
    backgroundColor: FACE,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titlePill: {
    flexShrink: 1,
    maxWidth: '36%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
  },
  title: { fontSize: 16, lineHeight: 19, fontWeight: '900', textAlign: 'center' },

  faces: { flex: 1, minHeight: MINI + 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  first: { fontSize: 15, lineHeight: 19, fontWeight: '800', textAlign: 'center' },
  mini: { alignItems: 'center' },
  miniOverlap: { marginLeft: -12 },
  miniRing: { borderRadius: radii.pill, borderWidth: 2, borderColor: '#F3E3D3' },
  miniBadge: {
    marginTop: -10,
    minWidth: 40,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radii.pill,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  miniPoints: { fontSize: 10, lineHeight: 14, fontWeight: '800' },

  arrow: {
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  arrowIcon: { transform: [{ rotate: '45deg' }] },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    paddingRight: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: ROW,
  },
  meRing: { borderRadius: radii.pill, borderWidth: 3, borderColor: FACE },
  name: { flex: 1, fontSize: 22, lineHeight: 28, fontWeight: '800' },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
  },
  points: { fontSize: 20, lineHeight: 26, fontWeight: '900' },
});
