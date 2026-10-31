import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { ToneFace } from '@/features/tutor/ToneFace';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { colors, radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';
import { TUTOR_TONES, type TutorTone } from '@/types';

interface ToneMenuProps {
  tone: TutorTone;
  onChange: (tone: TutorTone) => void;
}

interface Anchor {
  top: number;
  right: number;
}

const GAP = 8;

/** The tone pill in the conversation header and the list it opens, right under it. */
export function ToneMenu({ tone, onChange }: ToneMenuProps) {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const pill = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const open = () => {
    haptics.selection();
    pill.current?.measureInWindow((x, y, w, h) => setAnchor({ top: y + h + GAP, right: Math.max(width - (x + w), spacing.md) }));
  };

  const pick = (next: TutorTone) => {
    setAnchor(null);
    if (next === tone) return;
    haptics.light();
    onChange(next);
  };

  return (
    <>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${t('tutor.tone')}: ${t(`tutor.tone.${tone}`)}`}
        accessibilityState={{ expanded: anchor !== null }}
        hitSlop={6}
        onPress={open}
      >
        <View ref={pill} collapsable={false} style={styles.pill}>
          <ToneFace tone={tone} size={26} />
          <AppText variant="captionStrong" color={colors.primary} numberOfLines={1} style={styles.pillLabel}>
            {t(`tutor.tone.${tone}`)}
          </AppText>
          <Ionicons name={anchor ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
        </View>
      </PressableScale>

      <Modal visible={anchor !== null} transparent animationType="none" statusBarTranslucent onRequestClose={() => setAnchor(null)}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel={t('common.cancel')} onPress={() => setAnchor(null)}>
          <Animated.View entering={FadeIn.duration(150)} style={[StyleSheet.absoluteFill, styles.scrim]} />
        </Pressable>
        {anchor ? (
          <Animated.View entering={FadeInUp.duration(180)} style={[styles.menu, anchor]} accessibilityRole="menu">
            {TUTOR_TONES.map((option) => {
              const selected = option === tone;
              return (
                <PressableScale
                  key={option}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected }}
                  scaleTo={0.97}
                  onPress={() => pick(option)}
                  style={[styles.option, selected && styles.optionSelected]}
                >
                  <ToneFace tone={option} size={36} />
                  <AppText variant="bodyStrong" color={selected ? home.accent : home.text} style={styles.optionLabel}>
                    {t(`tutor.tone.${option}`)}
                  </AppText>
                  {selected ? <Ionicons name="checkmark" size={22} color={home.accent} /> : null}
                </PressableScale>
              );
            })}
          </Animated.View>
        ) : null}
      </Modal>
    </>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 42,
      paddingLeft: 6,
      paddingRight: spacing.md,
      borderRadius: radii.pill,
      backgroundColor: 'rgba(255, 255, 255, 0.96)',
      borderWidth: 2,
      borderBottomWidth: 4,
      borderColor: '#FFFFFF',
      borderBottomColor: '#D3E6F5',
    },
    pillLabel: { maxWidth: 96 },
    scrim: { backgroundColor: 'rgba(0, 0, 0, 0.12)' },
    menu: {
      position: 'absolute',
      minWidth: 210,
      gap: 2,
      padding: spacing.sm,
      borderRadius: radii.lg,
      backgroundColor: home.panel,
      borderWidth: 2,
      borderBottomWidth: 6,
      borderColor: home.rim,
      borderBottomColor: home.rimBottom,
      boxShadow: '0 12px 30px rgba(10, 30, 60, 0.18)',
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      height: 56,
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
    },
    optionSelected: { backgroundColor: home.selected },
    optionLabel: { flex: 1 },
  });
