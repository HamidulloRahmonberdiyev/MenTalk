import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { radii, spacing, typography } from '@/theme';
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

const RADIUS = 30;
const DEPTH = 6;
const INK = '#1E3F73';
const ON_CARD = 'rgba(255, 255, 255, 0.86)';

/** The translation on a blue gradient card, the same family as the talk card on the home tab. */
export function ResultCard({ result, stale, speaking, copied, favorite, onSpeak, onCopy, onShare, onToggleFavorite }: ResultCardProps) {
  const t = useT();
  const from = languageOf(result.sourceLanguage);
  const to = languageOf(result.targetLanguage);
  const shown = result.stressed || result.translation;

  return (
    <Animated.View entering={FadeIn.duration(220)} style={[styles.outer, stale && styles.stale]}>
      <View style={styles.edge} />
      <LinearGradient colors={['#6FA8E8', '#2F6DBF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <View style={styles.art} pointerEvents="none">
          <Ionicons name="language" size={150} color="rgba(255, 255, 255, 0.14)" />
        </View>

        <View style={styles.header}>
          <View style={styles.route}>
            <AppText variant="captionStrong" color="#FFFFFF">
              {`${from.flag} ${from.name}  →  ${to.flag} ${to.name}`}
            </AppText>
          </View>
          {stale ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
        </View>

        <AppText variant="title" color="#FFFFFF" selectable style={styles.translation}>
          {shown}
        </AppText>

        {result.reading ? (
          <View style={styles.reading}>
            <AppText variant="captionStrong" color={ON_CARD}>
              {t('translate.reading')}
            </AppText>
            <AppText variant="bodyStrong" color="#FFFFFF" selectable>
              {result.reading}
            </AppText>
          </View>
        ) : null}

        {result.note ? (
          <View style={styles.note}>
            <Ionicons name="information-circle" size={18} color={INK} />
            <AppText variant="caption" color={INK} style={styles.flex}>
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
        <Ionicons name={icon} size={20} color={active ? '#FFFFFF' : INK} />
      </View>
      <AppText variant="captionStrong" color={ON_CARD} numberOfLines={1}>
        {label}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // Raised like the home cards: the face rests on a darker edge.
  outer: { paddingBottom: DEPTH, borderRadius: RADIUS },
  edge: { position: 'absolute', left: 0, right: 0, bottom: 0, top: DEPTH, borderRadius: RADIUS, backgroundColor: '#24508F' },
  card: { padding: spacing.xl, gap: spacing.md, borderRadius: RADIUS, overflow: 'hidden' },
  art: { position: 'absolute', right: -20, top: -10, transform: [{ rotate: '-12deg' }] },
  stale: { opacity: 0.55 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  route: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  translation: { ...typography.title, fontSize: 28, lineHeight: 36, fontWeight: '900' },
  reading: { gap: 2 },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
  },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  action: { flex: 1, alignItems: 'center', gap: spacing.xs },
  actionCircle: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  actionCircleOn: { backgroundColor: '#58CC02' },
});
