import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { colors, radii, shadows, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';
import type { IconName } from '@/types';

import type { ScreenNotice } from './useConversation';

/** Information keeps a calm icon; anything else is a problem. */
const INFO_ICONS: Partial<Record<ScreenNotice, IconName>> = {
  slow: 'time-outline',
  reconnecting: 'sync-outline',
  voiceMissing: 'volume-mute-outline',
  handsFreeOn: 'infinite',
  handsFreeOff: 'hand-left-outline',
};

const VISIBLE_MS = 4500;
/** Clears the conversation header. */
const HEADER_HEIGHT = 56;

interface NoticeBannerProps {
  notice: { code: ScreenNotice; id: number } | null;
  onDismiss: () => void;
}

/** Short, self-dismissing message: a turn that failed while the conversation carries on, or a change the learner made. */
export function NoticeBanner({ notice, onDismiss }: NoticeBannerProps) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const t = useT();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(onDismiss, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [notice, onDismiss]);

  if (!notice) return null;

  return (
    <Animated.View entering={FadeInUp.duration(220)} exiting={FadeOutUp.duration(160)} style={[styles.wrap, { top: insets.top + HEADER_HEIGHT }]}>
      <PressableScale accessibilityRole="alert" onPress={onDismiss} style={styles.banner}>
        {INFO_ICONS[notice.code] ? (
          <Ionicons name={INFO_ICONS[notice.code]} size={20} color={home.textMuted} />
        ) : (
          <Ionicons name="alert-circle" size={20} color={colors.danger} />
        )}
        <AppText variant="captionStrong" style={styles.text}>
          {t(`notice.${notice.code}`)}
        </AppText>
      </PressableScale>
    </Animated.View>
  );
}

const createStyles = (home: Palette) => StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.xl, right: spacing.xl, zIndex: 30, elevation: 30 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: home.panel,
    ...shadows.raised,
  },
  text: { flex: 1 },
});
