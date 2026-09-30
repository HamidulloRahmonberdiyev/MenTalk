import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { LANGUAGES } from '@/i18n';
import { haptics } from '@/services/haptics';
import { useSettingsStore } from '@/store/settingsStore';
import { colors, radii, spacing } from '@/theme';

export function LanguageChips() {
  const language = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);

  return (
    <View style={styles.row}>
      {LANGUAGES.map(({ code, flag }) => {
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
            style={[styles.chip, selected && styles.selected]}
          >
            <AppText style={styles.flag}>{flag}</AppText>
            <AppText variant="captionStrong" color={selected ? colors.onPrimary : colors.textSecondary}>
              {code.toUpperCase()}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  flag: { fontSize: 14 },
});
