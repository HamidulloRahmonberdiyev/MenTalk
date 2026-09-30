import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useT } from '@/i18n';
import { colors, spacing } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';

interface LoadingViewProps {
  label?: string;
  inverted?: boolean;
}

export function LoadingView({ label, inverted = false }: LoadingViewProps) {
  return (
    <View style={styles.center} accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={inverted ? '#FFFFFF' : colors.primary} />
      {label ? (
        <AppText color={inverted ? '#FFFFFF' : colors.textSecondary} style={styles.text}>
          {label}
        </AppText>
      ) : null}
    </View>
  );
}

interface ErrorViewProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorView({ message, onRetry }: ErrorViewProps) {
  const t = useT();
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
      <AppText variant="subheading" style={styles.text}>
        {t('error.title')}
      </AppText>
      <AppText color={colors.textSecondary} style={styles.text}>
        {message}
      </AppText>
      {onRetry ? <Button title={t('common.retry')} onPress={onRetry} style={styles.retry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  text: {
    textAlign: 'center',
  },
  retry: {
    alignSelf: 'stretch',
    marginTop: spacing.md,
  },
});
