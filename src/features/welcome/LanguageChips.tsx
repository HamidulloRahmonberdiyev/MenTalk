import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { LANGUAGES } from '@/i18n';
import { haptics } from '@/services/haptics';
import { useSettingsStore } from '@/store/settingsStore';
import { radii, spacing } from '@/theme';

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
            <AppText variant="captionStrong" color={selected ? '#0B0F2B' : 'rgba(255,255,255,0.85)'}>
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
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  selected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  flag: { fontSize: 14 },
});
