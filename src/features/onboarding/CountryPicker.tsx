import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { useSettingsStore } from '@/store/settingsStore';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import type { CountryCode } from '@/types';

import { COUNTRIES, POPULAR_IDS, findCountry, normalize, type Country } from './countries';

interface CountryPickerProps {
  value: CountryCode | null;
  onChange: (id: CountryCode) => void;
}

type Item =
  | { kind: 'header'; key: string; label: string }
  | { kind: 'country'; key: string; country: Country };

const ROW_HEIGHT = 64;

export function CountryPicker({ value, onChange }: CountryPickerProps) {
  const t = useT();
  const language = useSettingsStore((state) => state.language);
  const [query, setQuery] = useState('');

  const sorted = useMemo(
    () => [...COUNTRIES].sort((a, b) => a.names[language].localeCompare(b.names[language], language)),
    [language],
  );

  const items = useMemo<Item[]>(() => {
    const needle = normalize(query.trim());
    if (needle) {
      const hits = sorted.filter(
        (country) =>
          country.id.toLowerCase() === needle ||
          Object.values(country.names).some((name) => normalize(name).includes(needle)),
      );
      return hits.map((country) => ({ kind: 'country', key: country.id, country }));
    }

    const result: Item[] = [{ kind: 'header', key: 'h-popular', label: t('country.popular') }];
    for (const id of POPULAR_IDS) {
      const country = findCountry(id);
      if (country) result.push({ kind: 'country', key: `p-${id}`, country });
    }
    result.push({ kind: 'header', key: 'h-all', label: t('country.all') });
    let letter = '';
    for (const country of sorted) {
      const first = country.names[language].charAt(0).toUpperCase();
      if (first !== letter) {
        letter = first;
        result.push({ kind: 'header', key: `l-${first}`, label: first });
      }
      result.push({ kind: 'country', key: country.id, country });
    }
    return result;
  }, [query, sorted, language, t]);

  const select = useCallback(
    (id: CountryCode) => {
      haptics.selection();
      onChange(id);
    },
    [onChange],
  );

  const selected = findCountry(value);

  return (
    <View style={styles.root}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('country.search')}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel={t('country.search')}
          style={styles.searchInput}
        />
        {query ? (
          <Pressable accessibilityRole="button" hitSlop={10} onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {selected ? (
        <View style={styles.chosen}>
          <AppText style={styles.chosenFlag}>{selected.emoji}</AppText>
          <View style={styles.chosenTexts}>
            <AppText variant="caption" color={colors.primaryDark} style={styles.chosenLabel}>
              {t('country.yours')}
            </AppText>
            <AppText variant="bodyStrong" numberOfLines={1}>
              {selected.names[language]}
            </AppText>
          </View>
          <View style={styles.chosenCheck}>
            <Ionicons name="checkmark" size={16} color={colors.onPrimary} />
          </View>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.key}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        initialNumToRender={14}
        windowSize={9}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <AppText style={styles.emptyEmoji}>🧭</AppText>
            <AppText variant="bodyStrong" color={colors.textSecondary}>
              {t('country.empty')}
            </AppText>
          </View>
        }
        renderItem={({ item }) =>
          item.kind === 'header' ? (
            <AppText variant="captionStrong" color={colors.textMuted} style={styles.header}>
              {item.label}
            </AppText>
          ) : (
            <CountryRow
              country={item.country}
              name={item.country.names[language]}
              selected={item.country.id === value}
              onSelect={select}
            />
          )
        }
      />
    </View>
  );
}

interface CountryRowProps {
  country: Country;
  name: string;
  selected: boolean;
  onSelect: (id: CountryCode) => void;
}

const CountryRow = memo(function CountryRow({ country, name, selected, onSelect }: CountryRowProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={name}
      onPress={() => onSelect(country.id)}
      style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && styles.rowPressed]}
    >
      <View style={[styles.flagWrap, selected && styles.flagWrapSelected]}>
        <AppText style={styles.flag}>{country.emoji}</AppText>
      </View>
      <AppText variant="bodyStrong" numberOfLines={1} style={styles.name}>
        {name}
      </AppText>
      <View style={[styles.check, selected && styles.checkOn]}>
        {selected ? <Ionicons name="checkmark" size={15} color={colors.onPrimary} /> : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, gap: spacing.md },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 54,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.card,
  },
  searchInput: { ...typography.body, flex: 1, paddingVertical: 0, color: colors.text },
  chosen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.primaryTint,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  chosenFlag: { fontSize: 32, lineHeight: 40 },
  chosenTexts: { flex: 1 },
  chosenLabel: { textTransform: 'uppercase', letterSpacing: 0.6 },
  chosenCheck: {
    width: 26,
    height: 26,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  list: { paddingBottom: spacing.xl, gap: spacing.xs },
  header: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.surface,
  },
  rowSelected: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  rowPressed: { backgroundColor: colors.primarySoft },
  flagWrap: {
    width: 42,
    height: 42,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  flagWrapSelected: { backgroundColor: colors.surface },
  flag: { fontSize: 24, lineHeight: 30 },
  name: { flex: 1 },
  check: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxxl },
  emptyEmoji: { fontSize: 40, lineHeight: 48 },
});
