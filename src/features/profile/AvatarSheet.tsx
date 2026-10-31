import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT, type TranslationKey } from '@/i18n';
import { haptics } from '@/services/haptics';
import { colors, radii, spacing } from '@/theme';
import type { IconName } from '@/types';

import type { AvatarSource } from './pickAvatar';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

export type AvatarAction = AvatarSource | 'remove';

interface AvatarSheetProps {
  visible: boolean;
  canRemove: boolean;
  onSelect: (action: AvatarAction) => void;
  onClose: () => void;
  onClosed: () => void;
}

const ACTIONS: readonly { id: AvatarAction; icon: IconName; label: TranslationKey }[] = [
  { id: 'camera', icon: 'camera', label: 'profile.photo.camera' },
  { id: 'library', icon: 'images', label: 'profile.photo.library' },
  { id: 'remove', icon: 'trash', label: 'profile.photo.remove' },
];

export function AvatarSheet({ visible, canRemove, onSelect, onClose, onClosed }: AvatarSheetProps) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const t = useT();

  return (
    <BottomSheet visible={visible} onClose={onClose} onClosed={onClosed} closeLabel={t('common.cancel')}>
      <AppText variant="heading" style={styles.title} accessibilityRole="header">
        {t('profile.photo.title')}
      </AppText>
      <View style={styles.list}>
        {ACTIONS.filter(({ id }) => id !== 'remove' || canRemove).map(({ id, icon, label }) => {
          const tint = id === 'remove' ? colors.danger : colors.primary;
          return (
            <PressableScale
              key={id}
              accessibilityRole="button"
              onPress={() => {
                haptics.light();
                onSelect(id);
              }}
              style={styles.row}
            >
              <IconTile icon={icon} tint={tint} size={42} />
              <AppText variant="bodyStrong" color={id === 'remove' ? colors.danger : home.text} style={styles.label}>
                {t(label)}
              </AppText>
              <Ionicons name="chevron-forward" size={20} color={home.textMuted} />
            </PressableScale>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const createStyles = (home: Palette) => StyleSheet.create({
  title: { textAlign: 'center' },
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: home.background,
  },
  label: { flex: 1 },
});
