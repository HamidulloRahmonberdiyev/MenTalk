import { useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useT } from '@/i18n';
import { spacing } from '@/theme';

import { ShortcutGrid, type Shortcut } from './ShortcutGrid';

interface AllShortcutsSheetProps {
  visible: boolean;
  items: Shortcut[];
  onClose: () => void;
}

/**
 * Every practice shortcut at once, as a grid, behind the "see all" link of the home rail. The chosen
 * one runs after the sheet has slid away, so a shortcut that opens its own sheet never overlaps it.
 */
export function AllShortcutsSheet({ visible, items, onClose }: AllShortcutsSheetProps) {
  const t = useT();
  const chosen = useRef<(() => void) | null>(null);

  const deferred = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        onPress: () => {
          chosen.current = item.onPress;
          onClose();
        },
      })),
    [items, onClose],
  );

  const runChosen = () => {
    const run = chosen.current;
    chosen.current = null;
    run?.();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} onClosed={runChosen} closeLabel={t('common.close')}>
      <AppText variant="heading" accessibilityRole="header">
        {t('home.practice.title')}
      </AppText>
      <View style={styles.grid}>
        <ShortcutGrid items={deferred} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  grid: { paddingBottom: spacing.md },
});
