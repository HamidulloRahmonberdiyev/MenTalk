import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { LANGUAGES } from '@/i18n';
import { haptics } from '@/services/haptics';
import { useSettingsStore } from '@/store/settingsStore';
import { colors, radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

export function LanguageSwitcher({ onSelect }: { onSelect?: () => void }) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const language = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);

  return (
    <View style={styles.list}>
      {LANGUAGES.map(({ code, label, flag }) => {
        const selected = code === language;
        return (
          <PressableScale
            key={code}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => {
              haptics.selection();
              setLanguage(code);
              onSelect?.();
            }}
            style={[styles.row, selected && styles.selected]}
          >
            <AppText style={styles.flag}>{flag}</AppText>
            <AppText variant="bodyStrong" style={styles.label}>
              {label}
            </AppText>
            <Ionicons
              name={selected ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={selected ? colors.primary : home.rim}
            />
          </PressableScale>
        );
      })}
    </View>
  );
}

const createStyles = (home: Palette) => StyleSheet.create({
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: home.background,
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: home.primaryTint,
  },
  flag: { fontSize: 24 },
  label: { flex: 1 },
});
