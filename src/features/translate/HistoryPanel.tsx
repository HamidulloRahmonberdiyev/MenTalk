import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Pressable3D } from '@/components/ui/Pressable3D';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { colors, radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';
import type { SavedTranslation } from '@/types';

import { languageOf } from './languages';
import { useTranslatorStore } from './translatorStore';

interface HistoryPanelProps {
  onPick: (item: SavedTranslation) => void;
}

type Tab = 'history' | 'favorites';

/** Recent translations and saved phrases, shown while the input is empty. */
export function HistoryPanel({ onPick }: HistoryPanelProps) {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const [tab, setTab] = useState<Tab>('history');
  const history = useTranslatorStore((state) => state.history);
  const favorites = useTranslatorStore((state) => state.favorites);
  const removeHistory = useTranslatorStore((state) => state.removeHistory);
  const clearHistory = useTranslatorStore((state) => state.clearHistory);
  const toggleFavorite = useTranslatorStore((state) => state.toggleFavorite);

  const items = tab === 'history' ? history : favorites;

  return (
    <View style={styles.wrap}>
      <View style={styles.tabs}>
        <View style={styles.segment} accessibilityRole="tablist">
          {(['history', 'favorites'] as const).map((value) => {
            const on = tab === value;
            return (
              <PressableScale
                key={value}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  haptics.selection();
                  setTab(value);
                }}
                style={[styles.tab, on && styles.tabOn]}
              >
                <Ionicons name={value === 'history' ? 'time' : 'star'} size={16} color={on ? colors.onPrimary : home.textMuted} />
                <AppText variant="captionStrong" color={on ? colors.onPrimary : home.textMuted}>
                  {t(`translate.${value}`)}
                </AppText>
              </PressableScale>
            );
          })}
        </View>
        <View style={styles.flex} />
        {tab === 'history' && history.length > 0 ? (
          <PressableScale accessibilityRole="button" hitSlop={8} onPress={clearHistory}>
            <AppText variant="captionStrong" color={home.textMuted}>
              {t('translate.clearAll')}
            </AppText>
          </PressableScale>
        ) : null}
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name={tab === 'history' ? 'language' : 'star'} size={30} color={home.accent} />
          </View>
          <AppText color={home.textMuted} style={styles.emptyText}>
            {tab === 'history' ? t('translate.historyEmpty') : t('translate.favoritesEmpty')}
          </AppText>
        </View>
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <Pressable3D
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.sourceText} — ${item.translation}`}
              onPress={() => onPick(item)}
              edgeColor={home.rimBottom}
              depth={4}
              radius={radii.lg}
              faceStyle={styles.row}
            >
              <View style={styles.texts}>
                <AppText variant="caption" color={home.textMuted} numberOfLines={1}>
                  {`${languageOf(item.sourceLanguage).flag} ${item.sourceText}`}
                </AppText>
                <AppText variant="bodyStrong" color={home.text} numberOfLines={2}>
                  {`${languageOf(item.targetLanguage).flag} ${item.translation}`}
                </AppText>
              </View>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={tab === 'history' ? t('translate.delete') : t('translate.saved')}
                hitSlop={10}
                onPress={() => (tab === 'history' ? removeHistory(item.id) : toggleFavorite(item))}
                style={styles.remove}
              >
                <Ionicons name={tab === 'history' ? 'close' : 'star'} size={18} color={tab === 'history' ? home.textMuted : colors.warning} />
              </PressableScale>
            </Pressable3D>
          ))}
        </View>
      )}
    </View>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    wrap: { gap: spacing.md, marginTop: spacing.sm },
    flex: { flex: 1 },
    tabs: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    segment: {
      flexDirection: 'row',
      gap: 4,
      padding: 4,
      borderRadius: radii.pill,
      borderWidth: 2,
      borderColor: home.rim,
      backgroundColor: home.panel,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs + 2,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.pill,
    },
    tabOn: { backgroundColor: colors.primary },
    empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: radii.lg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderBottomWidth: 5,
      borderColor: home.rim,
      borderBottomColor: home.rimBottom,
      backgroundColor: home.panel,
    },
    emptyText: { textAlign: 'center', maxWidth: 260 },
    list: { gap: spacing.md },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
      borderWidth: 2,
      borderColor: home.rim,
      backgroundColor: home.panel,
    },
    texts: { flex: 1, gap: 2 },
    remove: {
      width: 32,
      height: 32,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: home.track,
    },
  });
