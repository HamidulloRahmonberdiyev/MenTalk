import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { colors, radii, spacing, typography } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

interface TextComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function TextComposer({ onSend, disabled = false }: TextComposerProps) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const t = useT();
  const [value, setValue] = useState('');
  const canSend = value.trim().length > 0 && !disabled;

  const submit = () => {
    if (!canSend) return;
    onSend(value.trim());
    setValue('');
  };

  return (
    <View style={styles.row}>
      <TextInput
        value={value}
        onChangeText={setValue}
        onSubmitEditing={submit}
        placeholder={t('conversation.placeholder')}
        placeholderTextColor={home.textMuted}
        returnKeyType="send"
        autoFocus
        style={styles.input}
        accessibilityLabel={t('conversation.answer')}
      />
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t('conversation.send')}
        disabled={!canSend}
        onPress={submit}
        style={[styles.send, !canSend && styles.sendDisabled]}
      >
        <Ionicons name="arrow-up" size={22} color={colors.onPrimary} />
      </PressableScale>
    </View>
  );
}

const createStyles = (home: Palette) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    paddingLeft: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: home.panel,
    borderWidth: 1,
    borderColor: home.rim,
  },
  input: {
    ...typography.body,
    flex: 1,
    color: home.text,
    paddingVertical: spacing.sm,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  sendDisabled: {
    opacity: 0.4,
  },
});
