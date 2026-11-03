import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { PressableScale } from '@/components/ui/PressableScale';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useT, type Translate, type TranslationKey } from '@/i18n';
import { isApiConfigured } from '@/services/api/config';
import { haptics } from '@/services/haptics';
import { syncNotifications } from '@/services/session/notificationsSync';
import { useSettingsStore } from '@/store/settingsStore';
import { radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';
import { duration, easing, enter } from '@/theme/motion';

import { NotificationCard } from './NotificationCard';
import { countUnread, useNotificationsStore } from './notificationsStore';
import type { AppNotification } from './types';

const LOCALES = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-GB' } as const;
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
/** Cards after this many come in together instead of one by one. */
const STAGGER_LIMIT = 8;

type Filter = 'all' | 'unread';
type Group = 'today' | 'yesterday' | 'earlier';

const GROUP_TITLES: Record<Group, TranslationKey> = { today: 'notif.group.today', yesterday: 'notif.group.yesterday', earlier: 'notif.group.earlier' };

const startOfDay = (time: number) => new Date(time).setHours(0, 0, 0, 0);

function groupOf(createdAt: number, today: number): Group {
  if (createdAt >= today) return 'today';
  return createdAt >= today - 24 * HOUR ? 'yesterday' : 'earlier';
}

function timeLabel(t: Translate, createdAt: number, now: number, locale: string): string {
  const ago = now - createdAt;
  if (ago < MINUTE) return t('notif.time.now');
  if (ago < HOUR) return t('notif.time.minutes', { n: Math.floor(ago / MINUTE) });
  if (createdAt >= startOfDay(now)) return t('notif.time.hours', { n: Math.floor(ago / HOUR) });
  const date = new Date(createdAt);
  if (createdAt >= startOfDay(now) - 24 * HOUR) return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

export function NotificationsScreen() {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const locale = LOCALES[useSettingsStore((state) => state.language)];
  const items = useNotificationsStore((state) => state.items);
  const unread = useNotificationsStore(countUnread);
  const { markRead, markAllRead, remove, clear, seedDemo } = useNotificationsStore.getState();
  const [filter, setFilter] = useState<Filter>('all');
  const [confirming, setConfirming] = useState(false);

  // The clock the "5 min ago" labels read; ticks every minute while the screen is open.
  const [now, setNow] = useState(() => Date.now());

  const [refreshing, setRefreshing] = useState(false);

  useEffect(seedDemo, [seedDemo]);
  // Fresh from the server each time the screen opens; what the device has shows meanwhile.
  useEffect(() => {
    void syncNotifications();
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await syncNotifications();
    setRefreshing(false);
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), MINUTE);
    return () => clearInterval(timer);
  }, []);

  const sections = useMemo(() => {
    const today = startOfDay(now);
    const shown = [...items].filter((item) => filter === 'all' || !item.read).sort((a, b) => b.createdAt - a.createdAt);
    const groups = new Map<Group, AppNotification[]>();
    for (const item of shown) {
      const group = groupOf(item.createdAt, today);
      groups.set(group, [...(groups.get(group) ?? []), item]);
    }
    // Each card's place in the whole list, so the cards come in one after another across sections.
    let order = 0;
    return [...groups.entries()].map(([group, list]) => ({ group, list: list.map((item) => ({ item, order: order++ })) }));
  }, [items, filter, now]);

  const open = (item: AppNotification) => {
    haptics.selection();
    markRead(item.id);
    if (item.action) router.push(item.action.href);
  };

  const dismiss = (item: AppNotification) => {
    haptics.light();
    remove(item.id);
  };

  const readAll = () => {
    haptics.success();
    markAllRead();
  };

  return (
    <View style={styles.root}>
      <StatusBar style={home.statusBar} />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <ScreenHeader title={t('notif.title')} onBack={() => router.back()} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={isApiConfigured ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={home.textMuted} /> : undefined}
      >
        {unread > 0 ? (
          <Animated.View entering={enter.rise()}>
            <LinearGradient colors={['#6FA8E8', '#2F6DBF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
              <View style={styles.heroIcon}>
                <Ionicons name="notifications" size={26} color="#FFFFFF" />
                <View style={styles.heroCount}>
                  <AppText style={styles.heroCountText} color="#2F6DBF">
                    {unread > 99 ? '99+' : unread}
                  </AppText>
                </View>
              </View>
              <View style={styles.heroTexts}>
                <AppText variant="subheading" color="#FFFFFF">
                  {t('notif.hero.title', { n: unread })}
                </AppText>
                <AppText variant="caption" color="rgba(255,255,255,0.85)">
                  {t('notif.hero.text')}
                </AppText>
              </View>
              <PressableScale accessibilityRole="button" onPress={readAll} style={styles.heroButton}>
                <Ionicons name="checkmark-done" size={16} color="#2F6DBF" />
                <AppText variant="captionStrong" color="#2F6DBF">
                  {t('notif.readAll')}
                </AppText>
              </PressableScale>
            </LinearGradient>
          </Animated.View>
        ) : null}

        {items.length > 0 ? (
          <View style={styles.segment} accessibilityRole="tablist">
            {(['all', 'unread'] as const).map((value) => {
              const active = filter === value;
              return (
                <PressableScale
                  key={value}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    haptics.selection();
                    setFilter(value);
                  }}
                  style={[styles.segmentItem, active && styles.segmentActive]}
                >
                  <AppText variant="captionStrong" color={active ? home.text : home.textMuted}>
                    {t(value === 'all' ? 'notif.filter.all' : 'notif.filter.unread')}
                  </AppText>
                  {value === 'unread' && unread > 0 ? (
                    <View style={styles.segmentBadge}>
                      <AppText style={styles.segmentBadgeText} color="#FFFFFF">
                        {unread}
                      </AppText>
                    </View>
                  ) : null}
                </PressableScale>
              );
            })}
          </View>
        ) : null}

        {sections.map(({ group, list }) => (
          <Animated.View key={group} layout={LinearTransition.duration(duration.base).easing(easing.out)} style={styles.section}>
            <AppText variant="captionStrong" color={home.textMuted} style={styles.sectionTitle}>
              {t(GROUP_TITLES[group])}
            </AppText>
            {list.map(({ item, order }) => (
              <Animated.View
                key={item.id}
                entering={enter.rise(Math.min(order, STAGGER_LIMIT) * 45)}
                exiting={FadeOut.duration(duration.fast)}
                layout={LinearTransition.duration(duration.base).easing(easing.out)}
              >
                <NotificationCard item={item} time={timeLabel(t, item.createdAt, now, locale)} onOpen={open} onDismiss={dismiss} />
              </Animated.View>
            ))}
          </Animated.View>
        ))}

        {sections.length === 0 ? (
          <Animated.View entering={enter.pop()} style={styles.empty}>
            <LinearGradient colors={['#7FD3FF', '#1CB0F6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.emptyBadge}>
              <Ionicons name={filter === 'unread' && items.length ? 'checkmark-done' : 'notifications-off'} size={36} color="#FFFFFF" />
            </LinearGradient>
            <AppText variant="heading" color={home.text} style={styles.center}>
              {t(filter === 'unread' && items.length ? 'notif.allRead.title' : 'notif.empty.title')}
            </AppText>
            <AppText color={home.textMuted} style={styles.center}>
              {t(filter === 'unread' && items.length ? 'notif.allRead.text' : 'notif.empty.text')}
            </AppText>
          </Animated.View>
        ) : null}

        {items.length > 0 ? (
          <PressableScale accessibilityRole="button" hitSlop={8} onPress={() => setConfirming(true)} style={styles.clear}>
            <Ionicons name="trash-outline" size={16} color={home.textMuted} />
            <AppText variant="captionStrong" color={home.textMuted}>
              {t('notif.clear')}
            </AppText>
          </PressableScale>
        ) : null}
      </ScrollView>

      <ConfirmSheet
        visible={confirming}
        icon="trash-outline"
        title={t('notif.clearConfirm.title')}
        message={t('notif.clearConfirm.text')}
        confirmLabel={t('notif.clear')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={() => {
          haptics.medium();
          clear();
          setConfirming(false);
        }}
        onCancel={() => setConfirming(false)}
      />
    </View>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: home.background },
    header: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
      backgroundColor: home.header,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: home.divider,
    },
    content: { gap: spacing.lg, padding: spacing.xl },
    hero: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radii.xl,
      borderBottomWidth: 5,
      borderBottomColor: '#24508F',
    },
    heroIcon: {
      width: 52,
      height: 52,
      borderRadius: radii.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    heroCount: {
      position: 'absolute',
      top: -6,
      right: -6,
      minWidth: 22,
      height: 22,
      paddingHorizontal: 5,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
    },
    heroCountText: { fontSize: 11, lineHeight: 13, fontWeight: '800' },
    heroTexts: { flex: 1, minWidth: 150, gap: 2 },
    heroButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.pill,
      backgroundColor: '#FFFFFF',
    },
    segment: {
      flexDirection: 'row',
      padding: 4,
      borderRadius: radii.pill,
      backgroundColor: home.track,
      borderWidth: 1,
      borderColor: home.rim,
    },
    segmentItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      borderRadius: radii.pill,
    },
    segmentActive: {
      backgroundColor: home.panel,
      boxShadow: '0 2px 8px rgba(16, 24, 40, 0.12)',
    },
    segmentBadge: {
      minWidth: 18,
      height: 18,
      paddingHorizontal: 5,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: home.badge,
    },
    segmentBadgeText: { fontSize: 10, lineHeight: 12, fontWeight: '800' },
    section: { gap: spacing.md },
    sectionTitle: { textTransform: 'uppercase', letterSpacing: 0.8, marginLeft: spacing.xs },
    empty: {
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.xl,
      padding: spacing.xxl,
      borderRadius: radii.xl,
      borderWidth: 2,
      borderBottomWidth: 6,
      borderColor: home.rim,
      borderBottomColor: home.rimBottom,
      backgroundColor: home.panel,
    },
    emptyBadge: {
      width: 76,
      height: 76,
      marginBottom: spacing.sm,
      borderRadius: radii.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    center: { textAlign: 'center' },
    clear: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      gap: 6,
      marginTop: spacing.sm,
      padding: spacing.sm,
    },
  });
