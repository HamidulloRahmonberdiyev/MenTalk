import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Pressable3D } from '@/components/ui/Pressable3D';
import { TelegramLogo } from '@/components/ui/TelegramLogo';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { colors, radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { GoogleLogo } from './GoogleLogo';

interface SignInOptionsProps {
  busy: 'telegram' | 'google' | null;
  onTelegram: () => void;
  onGoogle: () => void;
}

/** The two ways in: Telegram first (one tap, no password), Google under it. */
export function SignInOptions({ busy, onTelegram, onGoogle }: SignInOptionsProps) {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.root}>
      <ProviderButton
        title={t('auth.telegram')}
        hint={t('auth.telegram.hint')}
        logo={
          <View style={styles.telegramRing}>
            <TelegramLogo size={36} />
          </View>
        }
        face={colors.primary}
        edge="#1A84BF"
        ink={colors.onPrimary}
        hintInk="rgba(255,255,255,0.85)"
        loading={busy === 'telegram'}
        disabled={busy !== null}
        onPress={onTelegram}
      />

      <View style={styles.divider}>
        <View style={styles.rule} />
        <AppText variant="captionStrong" color={home.textMuted}>
          {t('auth.or')}
        </AppText>
        <View style={styles.rule} />
      </View>

      <ProviderButton
        title={t('auth.google')}
        logo={
          <View style={styles.googleTile}>
            <GoogleLogo size={22} />
          </View>
        }
        face={home.panel}
        edge={home.rimBottom}
        rim={home.rim}
        ink={home.text}
        loading={busy === 'google'}
        disabled={busy !== null}
        onPress={onGoogle}
      />

      <View style={styles.secure}>
        <Ionicons name="shield-checkmark" size={16} color={home.successInk} />
        <AppText variant="caption" color={home.textMuted} style={styles.secureText}>
          {t('auth.secure')}
        </AppText>
      </View>
    </View>
  );
}

interface ProviderButtonProps {
  title: string;
  hint?: string;
  logo: ReactNode;
  face: string;
  edge: string;
  rim?: string;
  ink: string;
  hintInk?: string;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}

function ProviderButton({ title, hint, logo, face, edge, rim, ink, hintInk, loading, disabled, onPress }: ProviderButtonProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable3D
      accessibilityRole="button"
      accessibilityLabel={hint ? `${title}. ${hint}` : title}
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled}
      onPress={() => {
        haptics.medium();
        onPress();
      }}
      edgeColor={edge}
      depth={5}
      radius={radii.lg}
      style={disabled && !loading && styles.dimmed}
      faceStyle={[styles.provider, { backgroundColor: face }, rim ? { borderWidth: 2, borderColor: rim } : styles.providerFlat]}
    >
      {logo}
      <View style={styles.providerTexts}>
        <AppText variant="bodyStrong" color={ink} numberOfLines={1}>
          {title}
        </AppText>
        {hint ? (
          <AppText variant="caption" color={hintInk ?? ink} numberOfLines={1}>
            {hint}
          </AppText>
        ) : null}
      </View>
      {loading ? <ActivityIndicator color={ink} /> : <Ionicons name="chevron-forward" size={20} color={ink} />}
    </Pressable3D>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    root: { gap: spacing.lg },
    provider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      minHeight: 68,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    // Same outer size as the outlined button, without a visible rim.
    providerFlat: { borderWidth: 2, borderColor: 'transparent' },
    providerTexts: { flex: 1, gap: 1 },
    dimmed: { opacity: 0.55 },
    telegramRing: { width: 42, height: 42, borderRadius: radii.pill, borderWidth: 3, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    googleTile: { width: 42, height: 42, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: home.rim },
    divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    rule: { flex: 1, height: 2, borderRadius: 1, backgroundColor: home.rim },
    secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
    secureText: { flexShrink: 1, textAlign: 'center' },
  });
