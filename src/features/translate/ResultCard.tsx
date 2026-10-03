import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import type { IconName, TranslationResult } from '@/types';

import { languageOf } from './languages';

interface ResultCardProps {
  result: TranslationResult;
  /** A newer translation is on its way; this one is shown dimmed. */
  stale: boolean;
  speaking: boolean;
  copied: boolean;
  favorite: boolean;
  onSpeak: () => void;
  onCopy: () => void;
  onShare: () => void;
  onToggleFavorite: () => void;
}

export function ResultCard({ result, stale, speaking, copied, favorite, onSpeak, onCopy, onShare, onToggleFavorite }: ResultCardProps) {
  const t = useT();
  const from = languageOf(result.sourceLanguage);
  const to = languageOf(result.targetLanguage);
  const shown = result.stressed || result.translation;

  return (
    <Animated.View entering={FadeIn.duration(220)} style={shadows.raised}>
      <LinearGradient colors={['#FFFFFF', colors.primaryTint]} style={[styles.card, stale && styles.stale]}>
        <View style={styles.header}>
          <AppText variant="captionStrong" color={colors.primaryDark}>
            {`${from.flag} ${from.name}  →  ${to.flag} ${to.name}`}
          </AppText>
          {stale ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        </View>

        <AppText variant="title" selectable style={styles.translation}>
          {shown}
        </AppText>

        {result.reading ? (
          <View style={styles.reading}>
            <AppText variant="captionStrong" color={colors.textMuted}>
              {t('translate.reading')}
            </AppText>
            <AppText variant="bodyStrong" color={colors.primaryDark} selectable>
              {result.reading}
            </AppText>
          </View>
        ) : null}

        {result.note ? (
          <View style={styles.note}>
            <Ionicons name="information-circle" size={18} color={colors.primary} />
            <AppText variant="caption" color={colors.textSecondary} style={styles.noteText}>
              {result.note}
            </AppText>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Action icon={speaking ? 'volume-high' : 'volume-medium-outline'} label={t('translate.speak')} active={speaking} onPress={onSpeak} />
          <Action icon={copied ? 'checkmark' : 'copy-outline'} label={copied ? t('translate.copied') : t('translate.copy')} active={copied} onPress={onCopy} />
          <Action icon="share-social-outline" label={t('translate.share')} onPress={onShare} />
          <Action icon={favorite ? 'star' : 'star-outline'} label={favorite ? t('translate.saved') : t('translate.save')} active={favorite} onPress={onToggleFavorite} />
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

interface ActionProps {
  icon: IconName;
  label: string;
  active?: boolean;
  onPress: () => void;
}

function Action({ icon, label, active = false, onPress }: ActionProps) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.action}>
      <View style={[styles.actionCircle, active && styles.actionCircleOn]}>
        <Ionicons name={icon} size={20} color={active ? colors.onPrimary : colors.primary} />
      </View>
      <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
        {label}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.xl, gap: spacing.md, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border },
  stale: { opacity: 0.55 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  translation: { ...typography.title, fontSize: 26, lineHeight: 34 },
  reading: { gap: 2 },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
  },
  noteText: { flex: 1 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  action: { flex: 1, alignItems: 'center', gap: spacing.xs },
  actionCircle: {
    width: 46,
    height: 46,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  actionCircleOn: { backgroundColor: colors.primary },
});
