import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { LANGUAGES } from '@/i18n';
import { haptics } from '@/services/haptics';
import { useSettingsStore } from '@/store/settingsStore';
import { colors, radii, spacing } from '@/theme';

export function LanguageSwitcher() {
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
              color={selected ? colors.primary : colors.border}
            />
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: colors.background,
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  flag: { fontSize: 24 },
  label: { flex: 1 },
});
