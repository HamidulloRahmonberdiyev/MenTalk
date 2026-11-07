import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { PressableScale } from '@/components/ui/PressableScale';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ErrorView, LoadingView } from '@/components/ui/StateViews';
import { useT } from '@/i18n';
import type { ApiNotebookMistake, ApiMistakeSummary, MistakeCategory } from '@/services/api/endpoints';
import { haptics } from '@/services/haptics';
import { useSettingsStore } from '@/store/settingsStore';
import { colors, radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { categoryOf } from './categories';
import { MistakeEntry } from './MistakeEntry';
import { flushMistakeAnswers, refreshMistakeSummary, useMistakesStore } from './mistakesStore';
import { useNotebook } from './useNotebook';

const UNDO_MS = 5000;

interface Undo {
  mistake: ApiNotebookMistake;
  position: number;
}

/**
 * The mistakes notebook: every correction from the learner's conversations, grouped by kind,
 * with the round of personal practice one tap away.
 */
export function MistakesScreen() {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const language = useSettingsStore((state) => state.studyLanguage);
  const summary = useMistakesStore((state) => state.summaries[language]);
  const [category, setCategory] = useState<MistakeCategory | null>(null);
  const notebook = useNotebook(language, category);
  const [confirming, setConfirming] = useState<ApiNotebookMistake | null>(null);
  const [undo, setUndo] = useState<Undo | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Back from a drill: answers first, then the counts they changed.
  useFocusEffect(
    useCallback(() => {
      void flushMistakeAnswers().then(() => refreshMistakeSummary(language));
    }, [language]),
  );

  useEffect(
    () => () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    },
    [],
  );

  const refresh = async () => {
    setRefreshing(true);
    await notebook.reload();
    setRefreshing(false);
  };

  const dismiss = async (mistake: ApiNotebookMistake) => {
    setConfirming(null);
    const position = notebook.items.findIndex((item) => item.id === mistake.id);
    if (!(await notebook.dismiss(mistake))) return;
    haptics.light();
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo({ mistake, position });
    undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS);
  };

  const undoDismiss = () => {
    if (!undo) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    void notebook.restore(undo.mistake, undo.position);
    setUndo(null);
  };

  const practise = () => {
    haptics.selection();
    router.push('/mistakes-practice');
  };

  const header = (
    <View style={styles.headerBlock}>
      <Overview summary={summary} onPractise={practise} />
      {summary && Object.keys(summary.categories).length > 1 ? (
        <CategoryFilter summary={summary} selected={category} onSelect={setCategory} />
      ) : null}
    </View>
  );

  const empty =
    notebook.status === 'loading' ? (
      <LoadingView />
    ) : notebook.status === 'failed' ? (
      <ErrorView message={t('mistakes.loadFailed')} onRetry={notebook.retry} />
    ) : (
      <View style={styles.empty}>
        <AppText style={styles.emptyIcon}>📝</AppText>
        <AppText variant="heading" style={styles.center}>
          {t('mistakes.empty.title')}
        </AppText>
        <AppText color={home.textSecondary} style={styles.center}>
          {t('mistakes.empty.text')}
        </AppText>
        <Button title={t('mistakes.empty.action')} icon="chatbubbles" onPress={() => router.push('/scenarios')} />
      </View>
    );

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
      <StatusBar style={home.statusBar} />
      <ScreenHeader title={t('mistakes.title')} onBack={() => router.back()} style={styles.screenHeader} />

      <FlatList
        data={notebook.status === 'ready' ? notebook.items : []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MistakeEntry mistake={item} onMore={setConfirming} />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={notebook.loadingMore ? <ActivityIndicator color={colors.primary} style={styles.more} /> : null}
        ItemSeparatorComponent={Separator}
        onEndReached={notebook.loadMore}
        onEndReachedThreshold={0.4}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl * 2 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.primary} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
      />

      {undo ? (
        <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOutDown.duration(160)} style={[styles.toast, { bottom: insets.bottom + spacing.lg }]}>
          <AppText variant="bodyStrong" color="#FFFFFF" style={styles.flex}>
            {t('mistakes.dismissed')}
          </AppText>
          <PressableScale accessibilityRole="button" accessibilityLabel={t('mistakes.undo')} onPress={undoDismiss} hitSlop={10}>
            <AppText variant="bodyStrong" color={colors.primaryLight}>
              {t('mistakes.undo')}
            </AppText>
          </PressableScale>
        </Animated.View>
      ) : null}

      <ConfirmSheet
        visible={confirming !== null}
        icon="eye-off"
        title={t('mistakes.dismiss.title')}
        message={t('mistakes.dismiss.text')}
        confirmLabel={t('mistakes.dismiss')}
        cancelLabel={t('common.close')}
        onConfirm={() => confirming && void dismiss(confirming)}
        onCancel={() => setConfirming(null)}
      />
    </View>
  );
}

function Separator() {
  return <View style={{ height: spacing.md }} />;
}

/** Due count, the button that starts a round, and how the notebook is going overall. */
function Overview({ summary, onPractise }: { summary: ApiMistakeSummary | undefined; onPractise: () => void }) {
  const t = useT();
  const styles = useThemedStyles(createStyles);
  const total = summary?.total ?? 0;
  const due = summary?.due ?? 0;

  return (
    <View style={styles.hero}>
      <View style={styles.heroTop}>
        <View style={styles.heroBadge}>
          <Ionicons name="flash" size={22} color="#FFFFFF" />
        </View>
        <View style={styles.flex}>
          <AppText variant="heading" color="#FFFFFF">
            {due > 0 ? t('mistakes.due', { n: due }) : total > 0 ? t('mistakes.allDone') : t('mistakes.intro')}
          </AppText>
          <AppText variant="caption" color="rgba(255,255,255,0.85)">
            {t('mistakes.lead')}
          </AppText>
        </View>
      </View>

      <View style={styles.heroStats}>
        <HeroStat value={total} label={t('mistakes.stat.total')} />
        <View style={styles.heroDivider} />
        <HeroStat value={summary?.learning ?? 0} label={t('mistakes.stat.learning')} />
        <View style={styles.heroDivider} />
        <HeroStat value={summary?.mastered ?? 0} label={t('mistakes.stat.mastered')} />
      </View>

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t('mistakes.practise')}
        disabled={total === 0}
        onPress={onPractise}
        style={[styles.heroButton, total === 0 && styles.disabled]}
      >
        <Ionicons name="play" size={18} color="#C2410C" />
        <AppText variant="button" color="#C2410C">
          {due > 0 ? t('mistakes.practiseDue', { n: Math.min(due, 10) }) : t('mistakes.practise')}
        </AppText>
      </PressableScale>
    </View>
  );
}

function HeroStat({ value, label }: { value: number; label: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.heroStat}>
      <AppText variant="heading" color="#FFFFFF">
        {value}
      </AppText>
      <AppText variant="caption" color="rgba(255,255,255,0.85)" numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

/** The kinds of mistakes, most frequent first: the learner's weak spots at a glance, and a filter. */
function CategoryFilter({ summary, selected, onSelect }: { summary: ApiMistakeSummary; selected: MistakeCategory | null; onSelect: (category: MistakeCategory | null) => void }) {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const entries = Object.entries(summary.categories) as [MistakeCategory, number][];

  const chip = (key: MistakeCategory | null, label: string, count: number, tint: string) => {
    const active = selected === key;
    return (
      <PressableScale
        key={key ?? 'all'}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={`${label}, ${count}`}
        onPress={() => {
          haptics.selection();
          onSelect(active && key !== null ? null : key);
        }}
        style={[styles.chip, active ? { backgroundColor: tint, borderColor: tint } : { backgroundColor: home.panel, borderColor: home.rim }]}
      >
        <AppText variant="captionStrong" color={active ? '#FFFFFF' : home.text}>
          {label}
        </AppText>
        <AppText variant="captionStrong" color={active ? 'rgba(255,255,255,0.85)' : tint}>
          {count}
        </AppText>
      </PressableScale>
    );
  };

  return (
    <View style={styles.filter}>
      <AppText variant="captionStrong" color={home.textSecondary} style={styles.filterTitle}>
        {t('mistakes.weakSpots')}
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {chip(null, t('mistakes.all'), summary.total, colors.primary)}
        {entries.map(([key, count]) => {
          const category = categoryOf(key);
          return chip(key, t(category.label), count, category.tint);
        })}
      </ScrollView>
    </View>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: home.background },
    screenHeader: { paddingHorizontal: spacing.xl },
    content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, flexGrow: 1 },
    headerBlock: { gap: spacing.lg, marginBottom: spacing.lg },
    flex: { flex: 1 },
    center: { textAlign: 'center' },
    more: { marginVertical: spacing.lg },
    hero: {
      gap: spacing.lg,
      padding: spacing.xl,
      borderRadius: radii.xl,
      backgroundColor: '#F2683C',
      borderBottomWidth: 5,
      borderBottomColor: '#C2410C',
    },
    heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    heroBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.22)' },
    heroStats: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderRadius: radii.md, backgroundColor: 'rgba(0,0,0,0.12)' },
    heroStat: { flex: 1, alignItems: 'center', gap: 2 },
    heroDivider: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.25)' },
    heroButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      height: 52,
      borderRadius: radii.md,
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 4,
      borderBottomColor: '#FBD5C5',
    },
    disabled: { opacity: 0.55 },
    filter: { gap: spacing.sm },
    filterTitle: { textTransform: 'uppercase', letterSpacing: 0.8 },
    chips: { gap: spacing.sm, paddingRight: spacing.xl },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.pill, borderWidth: 1.5 },
    empty: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxxl, paddingHorizontal: spacing.lg },
    emptyIcon: { fontSize: 64, lineHeight: 78 },
    toast: {
      position: 'absolute',
      left: spacing.xl,
      right: spacing.xl,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      backgroundColor: '#1F2937',
    },
  });
