import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { GlassCard } from '@/components/ui/GlassCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { radii, spacing } from '@/theme';

interface ConversationHeaderProps {
  title: string;
  onBack: () => void;
  right?: ReactNode;
}

/** Back button, centered title and a trailing action, laid out with equal-width sides. */
export function ConversationHeader({ title, onBack, right }: ConversationHeaderProps) {
  const t = useT();

  return (
    <View style={styles.row}>
      <View style={styles.side}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={8}
          onPress={() => {
            haptics.light();
            onBack();
          }}
        >
          <GlassCard tint="dark" style={styles.back}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </GlassCard>
        </PressableScale>
      </View>

      <AppText variant="heading" color="#FFFFFF" numberOfLines={1} style={styles.title} accessibilityRole="header">
        {title}
      </AppText>

      <View style={[styles.side, styles.sideEnd]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: spacing.sm },
  side: { flex: 1, flexBasis: 0, flexDirection: 'row', alignItems: 'center' },
  sideEnd: { justifyContent: 'flex-end' },
  title: { flexShrink: 1, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 6 },
  back: { width: 40, height: 40, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
});
