import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useT } from '@/i18n';
import { useSettingsStore } from '@/store/settingsStore';
import { radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { Chip } from './Chip';

const OPTIONS = [
  { id: 'dark', emoji: '🌙' },
  { id: 'light', emoji: '☀️' },
] as const;

/** Dark or light look for the whole redesigned app, as two chunky options side by side. */
export function AppearanceSwitch() {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const appearance = useSettingsStore((state) => state.appearance);
  const setAppearance = useSettingsStore((state) => state.setAppearance);

  return (
    <View style={styles.card} accessibilityRole="radiogroup" accessibilityLabel={t('profile.appearance')}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <Ionicons name={appearance === 'dark' ? 'moon' : 'sunny'} size={22} color="#FFFFFF" />
        </View>
        <AppText variant="bodyStrong" color={home.text}>
          {t('profile.appearance')}
        </AppText>
      </View>
      <View style={styles.options}>
        {OPTIONS.map(({ id, emoji }) => (
          <View key={id} style={styles.flex}>
            <Chip emoji={emoji} label={t(`profile.appearance.${id}`)} selected={appearance === id} onPress={() => setAppearance(id)} />
          </View>
        ))}
      </View>
    </View>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    card: {
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderBottomWidth: 6,
      borderColor: home.rim,
      backgroundColor: home.panel,
    },
    head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    icon: {
      width: 40,
      height: 40,
      borderRadius: radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#5A6BF0',
    },
    options: { flexDirection: 'row', gap: spacing.sm },
    flex: { flex: 1 },
  });
