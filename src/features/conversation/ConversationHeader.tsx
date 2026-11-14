import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { GlassCard } from '@/components/ui/GlassCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import type { IconName } from '@/types';
import { radii, spacing } from '@/theme';

interface ConversationHeaderProps {
  title: string;
  onBack: () => void;
  /** Ends the chat and shows the result; the button is hidden until there is a chat to end. */
  onFinish?: () => void;
  finishing?: boolean;
  right?: ReactNode;
}

function GlassButton({ icon, label, onPress, busy = false }: { icon: IconName; label: string; onPress: () => void; busy?: boolean }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy }}
      disabled={busy}
      hitSlop={8}
      onPress={() => {
        haptics.light();
        onPress();
      }}
    >
      <GlassCard tint="dark" style={styles.button}>
        {busy ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Ionicons name={icon} size={22} color="#FFFFFF" />}
      </GlassCard>
    </PressableScale>
  );
}

/** Back on the left, the scenario in the middle, finish (and anything passed as `right`) on the right. */
export function ConversationHeader({ title, onBack, onFinish, finishing = false, right }: ConversationHeaderProps) {
  const t = useT();

  return (
    <View style={styles.row}>
      <View style={styles.side}>
        <GlassButton icon="chevron-back" label={t('common.back')} onPress={onBack} />
      </View>

      <AppText variant="heading" color="#FFFFFF" numberOfLines={1} style={styles.title} accessibilityRole="header">
        {title}
      </AppText>

      <View style={[styles.side, styles.sideEnd]}>
        {right}
        {onFinish ? <GlassButton icon="flag" label={t('conversation.finish')} onPress={onFinish} busy={finishing} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, gap: spacing.sm, zIndex: 10 },
  // One button wide on each side, even before finish appears, so the title stays centred.
  side: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 44 },
  sideEnd: { justifyContent: 'flex-end' },
  title: { flex: 1, textAlign: 'center', fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 6 },
  button: { width: 44, height: 44, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
});
