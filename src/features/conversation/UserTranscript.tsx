import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { useT } from '@/i18n';
import { radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

interface UserTranscriptProps {
  /** What the learner just said; nothing is rendered when empty or when the feature is off. */
  text: string | null;
  visible: boolean;
}

/** A compact, right-aligned chip with the learner's recognised sentence, like their side of a chat. */
export function UserTranscript({ text, visible }: UserTranscriptProps) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const t = useT();
  if (!visible || !text) return null;

  return (
    <Animated.View
      key={text}
      entering={FadeInDown.duration(300)}
      exiting={FadeOut.duration(150)}
      layout={LinearTransition}
      style={styles.row}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.chip}>
        <View style={styles.label}>
          <Ionicons name="mic" size={11} color={home.accent} />
          <AppText variant="caption" color={home.accent} style={styles.labelText}>
            {t('conversation.youSaid')}
          </AppText>
        </View>
        <AppText variant="caption" color={home.text} style={styles.text} numberOfLines={4}>
          {text}
        </AppText>
      </View>
    </Animated.View>
  );
}

const createStyles = (home: Palette) => StyleSheet.create({
  row: { alignItems: 'flex-end' },
  chip: {
    maxWidth: '86%',
    gap: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderBottomRightRadius: radii.sm / 3,
    backgroundColor: home.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(42, 171, 238, 0.22)',
  },
  label: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  labelText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },
  text: { fontSize: 14, lineHeight: 19, fontWeight: '500' },
});
