import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { useT } from '@/i18n';
import { colors, radii, spacing } from '@/theme';

import type { HintState } from './useConversation';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

interface HintCardProps {
  hint: HintState;
}

export function HintCard({ hint }: HintCardProps) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const t = useT();
  if (hint.status === 'hidden') return null;

  return (
    <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(150)} style={styles.card}>
      <View style={styles.badge}>
        <AppText>💡</AppText>
      </View>
      <View style={styles.texts}>
        <AppText variant="captionStrong">{t('conversation.hint')}</AppText>
        {hint.status === 'loading' ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <AppText color={home.textSecondary}>
            {t('conversation.hintSay', { text: hint.text })}
          </AppText>
        )}
      </View>
    </Animated.View>
  );
}

const createStyles = (home: Palette) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: home.primarySoft,
    borderWidth: 1.5,
    borderColor: home.rim,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: home.panel,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  loader: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
});
