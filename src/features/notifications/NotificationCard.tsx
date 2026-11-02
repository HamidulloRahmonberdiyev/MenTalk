import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT, type Translate } from '@/i18n';
import { radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { KIND_STYLES } from './kinds';
import type { AppNotification, NotificationText } from './types';

export const textOf = (t: Translate, text: NotificationText): string => (typeof text === 'string' ? text : t(text.key, text.params));

interface NotificationCardProps {
  item: AppNotification;
  time: string;
  onOpen: (item: AppNotification) => void;
  onDismiss: (item: AppNotification) => void;
}

export function NotificationCard({ item, time, onOpen, onDismiss }: NotificationCardProps) {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const kind = KIND_STYLES[item.kind];
  const title = textOf(t, item.title);
  const unread = !item.read;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${unread ? `${t('notif.unread')}. ` : ''}${title}. ${textOf(t, item.body)}. ${time}`}
      onPress={() => onOpen(item)}
      style={[styles.card, unread && { backgroundColor: `${kind.tint}14`, borderColor: `${kind.tint}55`, borderBottomColor: `${kind.tint}88` }]}
    >
      {unread ? <View style={[styles.stripe, { backgroundColor: kind.tint }]} /> : null}
      <View style={styles.row}>
        <View>
          <IconTile icon={kind.icon} tint={kind.tint} gradient={kind.gradient} size={48} />
          {unread ? <View style={[styles.dot, { backgroundColor: kind.tint }]} /> : null}
        </View>

        <View style={styles.texts}>
          <View style={styles.titleRow}>
            <AppText variant="bodyStrong" color={home.text} numberOfLines={1} style={styles.title}>
              {title}
            </AppText>
            <AppText variant="caption" color={unread ? kind.tint : home.textMuted} style={unread && styles.timeUnread}>
              {time}
            </AppText>
          </View>
          <AppText variant="caption" color={home.textSecondary} numberOfLines={3} style={styles.body}>
            {textOf(t, item.body)}
          </AppText>

          {item.action ? (
            <View style={[styles.action, { backgroundColor: `${kind.tint}1F` }]}>
              <AppText variant="captionStrong" color={kind.tint}>
                {textOf(t, item.action.label)}
              </AppText>
              <Ionicons name="arrow-forward" size={14} color={kind.tint} />
            </View>
          ) : null}
        </View>

        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t('notif.dismiss')}
          hitSlop={10}
          onPress={() => onDismiss(item)}
          style={styles.close}
        >
          <Ionicons name="close" size={16} color={home.textMuted} />
        </PressableScale>
      </View>
    </PressableScale>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    card: {
      overflow: 'hidden',
      padding: spacing.md,
      paddingLeft: spacing.lg,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderBottomWidth: 5,
      borderColor: home.rim,
      borderBottomColor: home.rimBottom,
      backgroundColor: home.panel,
    },
    stripe: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
    },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
    dot: {
      position: 'absolute',
      top: -3,
      right: -3,
      width: 14,
      height: 14,
      borderRadius: radii.pill,
      borderWidth: 2.5,
      borderColor: home.panel,
    },
    texts: { flex: 1, gap: 4 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    title: { flex: 1 },
    timeUnread: { fontWeight: '700' },
    body: { lineHeight: 19 },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: 7,
      borderRadius: radii.pill,
    },
    close: {
      width: 26,
      height: 26,
      marginTop: -2,
      marginRight: -4,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: home.track,
    },
  });
