import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ErrorView, LoadingView } from '@/components/ui/StateViews';
import { useT } from '@/i18n';
import type { ApiLeaderboardEntry, LeaderboardPeriod } from '@/services/api/endpoints';
import { haptics } from '@/services/haptics';
import { useUserStore } from '@/store/userStore';
import { radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { LeaderFace } from './LeaderFace';
import { useLeaderboard } from './useLeaderboard';

const LIMIT = 50;
const ORANGE = '#FF8A1F';
const ORANGE_SOFT = '#FFB06A';
const INK = '#2A0F5C';
const MEDALS = ['🥇', '🥈', '🥉'] as const;

/** The full leaderboard: this week or all time, the top 50, and the learner's own place even below them. */
export function LeaderboardScreen() {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<LeaderboardPeriod>('week');
  const { board, status, retry } = useLeaderboard(period, LIMIT);
  const name = useUserStore((state) => state.name);
  const avatarUrl = useUserStore((state) => state.avatarUrl);

  const me = board?.me;
  const meInTop = board?.top.some((entry) => entry.is_me) ?? false;

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.segment} accessibilityRole="tablist">
        {(['week', 'all'] as const).map((value) => {
          const active = period === value;
          return (
            <PressableScale
              key={value}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => {
                haptics.selection();
                setPeriod(value);
              }}
              style={[styles.segmentItem, active && styles.segmentActive]}
            >
              <AppText variant="captionStrong" color={active ? home.text : home.textMuted}>
                {t(value === 'week' ? 'leaderboard.week' : 'leaderboard.all')}
              </AppText>
            </PressableScale>
          );
        })}
      </View>

      {/* The learner's own standing, always in view at the top. */}
      <View style={styles.meCard}>
        <View style={styles.meRing}>
          <LeaderFace uri={avatarUrl} size={52} />
        </View>
        <View style={styles.meText}>
          <AppText color="#FFFFFF" numberOfLines={1} style={styles.meName}>
            {name}
          </AppText>
          <AppText color="rgba(255,255,255,0.9)" numberOfLines={1} variant="caption">
            {me?.rank ? t('leaderboard.place', { n: me.rank }) : t('leaderboard.unranked')}
          </AppText>
        </View>
        <View style={styles.xpPill}>
          <Ionicons name="flash" size={20} color={INK} />
          <AppText color={INK} style={styles.xpPillText}>
            {me?.xp ?? 0}
          </AppText>
        </View>
      </View>

      {period === 'week' ? (
        <AppText variant="caption" color={home.textMuted} style={styles.hint}>
          {t('leaderboard.weekHint')}
        </AppText>
      ) : null}
    </View>
  );

  const empty =
    status === 'loading' ? (
      <LoadingView />
    ) : status === 'failed' ? (
      <ErrorView message={t('leaderboard.loadFailed')} onRetry={retry} />
    ) : (
      <View style={styles.empty}>
        <AppText style={styles.emptyIcon}>🏆</AppText>
        <AppText variant="heading" style={styles.center}>
          {t('leaderboard.empty.title')}
        </AppText>
        <AppText color={home.textSecondary} style={styles.center}>
          {t('leaderboard.empty.text')}
        </AppText>
        <Button title={t('leaderboard.empty.action')} icon="chatbubbles" onPress={() => router.push('/scenarios')} />
      </View>
    );

  // Below the top 50: the learner's own row closes the list, after a gap.
  const footer =
    board && me?.rank && !meInTop ? (
      <View style={styles.footer}>
        <AppText color={home.textMuted} style={styles.center}>
          ···
        </AppText>
        <Row entry={{ rank: me.rank, name, avatar_url: avatarUrl, xp: me.xp, is_me: true }} />
      </View>
    ) : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
      <StatusBar style={home.statusBar} />
      <ScreenHeader title={t('leaderboard.title')} onBack={() => router.back()} style={styles.screenHeader} />
      <FlatList
        data={status === 'ready' ? (board?.top ?? []) : []}
        keyExtractor={(entry) => String(entry.rank)}
        renderItem={({ item }) => <Row entry={item} />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function Separator() {
  return <View style={{ height: spacing.sm }} />;
}

function Row({ entry }: { entry: ApiLeaderboardEntry }) {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const medal = MEDALS[entry.rank - 1];

  return (
    <View
      style={[styles.row, entry.is_me && styles.rowMe]}
      accessible
      accessibilityLabel={`${t('leaderboard.place', { n: entry.rank })}. ${entry.name}, ${entry.xp} XP`}
    >
      <View style={styles.rank}>
        {medal ? (
          <AppText style={styles.medal}>{medal}</AppText>
        ) : (
          <AppText variant="bodyStrong" color={home.textSecondary}>
            {entry.rank}
          </AppText>
        )}
      </View>
      <LeaderFace uri={entry.avatar_url} size={44} />
      <AppText variant="bodyStrong" numberOfLines={1} style={styles.rowName}>
        {entry.is_me ? `${entry.name} · ${t('leaderboard.you')}` : entry.name}
      </AppText>
      <View style={styles.rowXp}>
        <Ionicons name="flash" size={16} color={ORANGE} />
        <AppText variant="bodyStrong">{entry.xp}</AppText>
      </View>
    </View>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: home.background },
    screenHeader: { paddingHorizontal: spacing.lg },
    content: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.md },
    headerBlock: { gap: spacing.md, marginBottom: spacing.lg },

    segment: {
      flexDirection: 'row',
      padding: 4,
      borderRadius: radii.pill,
      backgroundColor: home.track,
      borderWidth: 1,
      borderColor: home.rim,
    },
    segmentItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: radii.pill },
    segmentActive: { backgroundColor: home.panel, boxShadow: '0 2px 8px rgba(16, 24, 40, 0.12)' },

    meCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.sm,
      paddingRight: spacing.md,
      borderRadius: radii.pill,
      backgroundColor: ORANGE,
      borderBottomWidth: 5,
      borderBottomColor: '#E0700A',
    },
    meRing: { borderRadius: radii.pill, borderWidth: 3, borderColor: ORANGE_SOFT },
    meText: { flex: 1, gap: 2 },
    meName: { fontSize: 20, lineHeight: 26, fontWeight: '800' },
    xpPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radii.pill,
      backgroundColor: '#FFFFFF',
    },
    xpPillText: { fontSize: 18, lineHeight: 24, fontWeight: '900' },
    hint: { textAlign: 'center' },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: home.panel,
      borderWidth: 1,
      borderColor: home.rim,
      borderBottomWidth: 3,
      borderBottomColor: home.rimBottom,
    },
    rowMe: { borderColor: ORANGE, borderBottomColor: '#E0700A', backgroundColor: home.warningFill },
    rank: { width: 32, alignItems: 'center' },
    medal: { fontSize: 24, lineHeight: 30 },
    rowName: { flex: 1 },
    rowXp: { flexDirection: 'row', alignItems: 'center', gap: 4 },

    footer: { gap: spacing.sm, marginTop: spacing.sm },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xxxl },
    emptyIcon: { fontSize: 56, lineHeight: 68 },
    center: { textAlign: 'center' },
  });
