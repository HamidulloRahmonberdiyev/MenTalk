import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Pressable3D } from '@/components/ui/Pressable3D';
import { TutorFigure } from '@/features/tutor/TutorFigure';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { pushTutorPrefs } from '@/services/session/profileSync';
import { activeTutorTone, useSettingsStore } from '@/store/settingsStore';
import { colors, radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';
import { TUTOR_CHARACTERS, type TutorCharacter } from '@/types';

const CHARACTER_EMOJI: Record<TutorCharacter, string> = {
  bubble: '🙂',
  sobo: '✨',
};

const PREVIEW = 104;

interface TileProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  children: ReactNode;
}

/** One chunky option: picture on top, name under it; the chosen one turns blue. */
function Tile({ label, selected, onPress, children }: TileProps) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable3D
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      edgeColor={selected ? '#1A84BF' : home.rimBottom}
      depth={4}
      radius={radii.md}
      style={styles.tile}
      faceStyle={[styles.tileFace, selected && styles.tileSelected]}
    >
      {children}
      <AppText variant="captionStrong" color={selected ? home.accent : home.text} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable3D>
  );
}

/** Profile settings for the conversation partner: who it is, with a live preview. (The tone picker is off for now.) */
export function TutorCard() {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const character = useSettingsStore((state) => state.tutorCharacter);
  const tone = useSettingsStore(activeTutorTone);
  const setCharacter = useSettingsStore((state) => state.setTutorCharacter);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <Ionicons name="sparkles" size={22} color="#FFFFFF" />
        </View>
        <View style={styles.flex}>
          <AppText variant="bodyStrong" color={home.text}>
            {t('tutor.title')}
          </AppText>
          <AppText variant="caption" color={home.textMuted}>
            {t('tutor.subtitle')}
          </AppText>
        </View>
      </View>

      <View style={styles.stage}>
        {/* Keyed by character so switching starts the new one fresh instead of morphing state across. */}
        <TutorFigure key={character} character={character} tone={tone} state="idle" emotion="happy" size={PREVIEW} />
      </View>

      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={t('tutor.character')}>
        {TUTOR_CHARACTERS.map((option) => (
          <Tile
            key={option}
            label={t(`tutor.character.${option}`)}
            selected={character === option}
            onPress={() => {
              setCharacter(option);
              void pushTutorPrefs({ character: option });
            }}
          >
            <AppText style={styles.emoji}>{CHARACTER_EMOJI[option]}</AppText>
          </Tile>
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
      borderBottomColor: home.rimBottom,
      backgroundColor: home.panel,
    },
    head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    icon: {
      width: 40,
      height: 40,
      borderRadius: radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    flex: { flex: 1 },
    stage: {
      height: PREVIEW * 1.35,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderRadius: radii.md,
      backgroundColor: home.primaryTint,
    },
    row: { flexDirection: 'row', gap: spacing.sm },
    tile: { flex: 1 },
    tileFace: {
      alignItems: 'center',
      gap: 4,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: 4,
      borderWidth: 2,
      borderColor: home.rim,
      backgroundColor: home.track,
    },
    tileSelected: { borderColor: colors.primary, backgroundColor: home.selected },
    emoji: { fontSize: 26, lineHeight: 32 },
  });
