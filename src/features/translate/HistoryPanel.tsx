import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { colors, radii, shadows, spacing } from '@/theme';
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
        {(['history', 'favorites'] as const).map((value) => (
          <PressableScale
            key={value}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === value }}
            onPress={() => {
              haptics.selection();
              setTab(value);
            }}
            style={[styles.tab, tab === value && styles.tabOn]}
          >
            <Ionicons
              name={value === 'history' ? 'time-outline' : 'star-outline'}
              size={16}
              color={tab === value ? colors.primaryDark : colors.textMuted}
            />
            <AppText variant="captionStrong" color={tab === value ? colors.primaryDark : colors.textMuted}>
              {t(`translate.${value}`)}
            </AppText>
          </PressableScale>
        ))}
        <View style={styles.flex} />
        {tab === 'history' && history.length > 0 ? (
          <PressableScale accessibilityRole="button" hitSlop={8} onPress={clearHistory}>
            <AppText variant="captionStrong" color={colors.textMuted}>
              {t('translate.clearAll')}
            </AppText>
          </PressableScale>
        ) : null}
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name={tab === 'history' ? 'language' : 'star'} size={32} color={colors.primaryLight} />
          <AppText color={colors.textSecondary} style={styles.emptyText}>
            {tab === 'history' ? t('translate.historyEmpty') : t('translate.favoritesEmpty')}
          </AppText>
        </View>
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <PressableScale
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.sourceText} — ${item.translation}`}
              onPress={() => onPick(item)}
              style={styles.row}
            >
              <View style={styles.texts}>
                <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
                  {`${languageOf(item.sourceLanguage).flag} ${item.sourceText}`}
                </AppText>
                <AppText variant="bodyStrong" numberOfLines={2}>
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
                <Ionicons name={tab === 'history' ? 'close' : 'star'} size={18} color={tab === 'history' ? colors.textMuted : colors.warning} />
              </PressableScale>
            </PressableScale>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  flex: { flex: 1 },
  tabs: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  tabOn: { backgroundColor: colors.primarySoft },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxxl },
  emptyText: { textAlign: 'center', maxWidth: 260 },
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  texts: { flex: 1, gap: 2 },
  remove: { width: 32, height: 32, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
});
