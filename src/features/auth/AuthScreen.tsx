import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT, type TranslationKey } from '@/i18n';
import { ApiError, NetworkError } from '@/services/api/http';
import {
  GoogleUnavailable,
  SignInCancelled,
  TelegramDeclined,
  TelegramExpired,
  authService,
  openTelegram,
  pendingTelegramAttempt,
  type AuthUser,
  type TelegramAttempt,
} from '@/services/auth';
import { haptics } from '@/services/haptics';
import { useUserStore } from '@/store/userStore';
import { radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { AuthHero } from './AuthHero';
import { SignInOptions } from './SignInOptions';
import { TelegramWaiting, type TelegramStage } from './TelegramWaiting';

type Failure = 'declined' | 'expired' | 'network' | 'telegram' | 'blocked' | 'googleUnavailable' | 'failed';

type Flow =
  | { kind: 'choose'; busy: 'telegram' | 'google' | null }
  | { kind: 'telegram'; stage: TelegramStage; attempt: TelegramAttempt };

const FAILURE_TEXT: Record<Failure, TranslationKey> = {
  declined: 'auth.error.declined',
  expired: 'auth.error.expired',
  network: 'auth.error.network',
  telegram: 'auth.error.telegram',
  blocked: 'auth.error.blocked',
  googleUnavailable: 'auth.unavailable',
  failed: 'auth.error',
};

/** Long enough to see all three steps ticked before the next screen slides in. */
const DONE_BEAT_MS = 650;

export function AuthScreen() {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const setName = useUserStore((state) => state.setName);
  const [flow, setFlow] = useState<Flow>({ kind: 'choose', busy: null });
  const [failure, setFailure] = useState<Failure | null>(null);
  // TEMP: shows the raw Google error under the message to diagnose Google sign-in; remove once it works.
  const [failureDetail, setFailureDetail] = useState<string | null>(null);
  const telegramRun = useRef<AbortController | null>(null);

  const finish = (user: AuthUser) => {
    setName(user.name);
    haptics.success();
    router.replace(useUserStore.getState().onboarded ? '/home' : '/onboarding');
  };

  const fail = (error: unknown) => {
    const kind = failureOf(error);
    if (__DEV__ && kind) console.warn('Sign-in failed:', error);
    setFlow({ kind: 'choose', busy: null });
    if (!kind) return;
    haptics.error();
    setFailure(kind);
  };

  const runTelegram = async (resume: boolean) => {
    telegramRun.current?.abort();
    const run = new AbortController();
    telegramRun.current = run;
    const options = {
      signal: run.signal,
      onProgress: ({ phase, attempt }: { phase: TelegramStage; attempt: TelegramAttempt }) => {
        if (!run.signal.aborted) setFlow({ kind: 'telegram', stage: phase, attempt });
      },
    };
    try {
      const user = resume ? await authService.resumeTelegramSignIn(options) : await authService.signInWithTelegram(options);
      if (!user || run.signal.aborted) return;
      setFlow((current) => (current.kind === 'telegram' ? { ...current, stage: 'done' } : current));
      await new Promise((resolve) => setTimeout(resolve, DONE_BEAT_MS));
      finish(user);
    } catch (error) {
      if (!run.signal.aborted) fail(error);
    } finally {
      if (telegramRun.current === run) telegramRun.current = null;
    }
  };

  // A sign-in the system interrupted (the app was closed while Telegram was in front) carries on here.
  const resumeTelegram = useEffectEvent(() => void runTelegram(true));
  useEffect(() => {
    let mounted = true;
    void pendingTelegramAttempt().then((attempt) => {
      if (attempt && mounted) resumeTelegram();
    });
    return () => {
      mounted = false;
      telegramRun.current?.abort();
    };
  }, []);

  const startTelegram = () => {
    setFailure(null);
    setFailureDetail(null);
    setFlow({ kind: 'choose', busy: 'telegram' });
    void runTelegram(false);
  };

  const cancelTelegram = () => {
    telegramRun.current?.abort();
    setFlow({ kind: 'choose', busy: null });
  };

  const signInWithGoogle = async () => {
    setFailure(null);
    setFailureDetail(null);
    setFlow({ kind: 'choose', busy: 'google' });
    try {
      finish(await authService.signInWithGoogle());
    } catch (error) {
      fail(error);
      if (failureOf(error)) setFailureDetail(describeError(error));
    }
  };

  const waiting = flow.kind === 'telegram';

  const goBack = () => {
    if (waiting) {
      cancelTelegram();
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  // Android's back button leaves the waiting screen, not the sign-in.
  const onHardwareBack = useEffectEvent(() => {
    if (!waiting) return false;
    cancelTelegram();
    return true;
  });
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => onHardwareBack());
    return () => subscription.remove();
  }, []);

  const botName = waiting && flow.attempt.botUsername ? `@${flow.attempt.botUsername}` : 'Telegram';

  return (
    <View style={styles.root}>
      <StatusBar style={home.statusBar} />
      <LinearGradient colors={[home.primarySoft, home.background]} style={styles.backdrop} pointerEvents="none" />

      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <BackButton onPress={goBack} icon={waiting ? 'close' : 'arrow-back'} accessibilityLabel={waiting ? t('auth.wait.cancel') : undefined} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <AuthHero variant={waiting ? 'telegram' : 'app'} />

        <Animated.View key={waiting ? 'wait' : 'choose'} entering={FadeInDown.duration(380)} style={styles.heading}>
          <AppText variant="title" style={styles.center} accessibilityRole="header">
            {waiting ? t('auth.wait.title') : t('auth.title')}
          </AppText>
          <AppText variant="body" color={home.textSecondary} style={styles.center}>
            {waiting ? t('auth.wait.subtitle', { bot: botName }) : t('auth.subtitle')}
          </AppText>
        </Animated.View>

        {failure && !waiting ? (
          <Animated.View entering={FadeIn.duration(220)} style={styles.failure} accessibilityRole="alert">
            <View style={styles.failureIcon}>
              <Ionicons name={failure === 'network' ? 'cloud-offline' : failure === 'blocked' ? 'lock-closed' : 'alert-circle'} size={20} color={home.dangerInk} />
            </View>
            <View style={styles.failureTexts}>
              <AppText variant="bodyStrong" color={home.dangerInk}>
                {t(FAILURE_TEXT[failure])}
              </AppText>
              {failureDetail ? (
                <AppText variant="caption" color={home.textMuted} selectable>
                  {failureDetail}
                </AppText>
              ) : null}
            </View>
          </Animated.View>
        ) : null}

        {waiting ? (
          <Animated.View key="wait-body" entering={FadeInDown.duration(380).delay(80)}>
            <TelegramWaiting stage={flow.stage} attempt={flow.attempt} />
          </Animated.View>
        ) : (
          <Animated.View key="choose-body" entering={FadeInDown.duration(380).delay(80)}>
            <SignInOptions busy={flow.busy} onTelegram={startTelegram} onGoogle={signInWithGoogle} />
          </Animated.View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        {waiting ? (
          <Animated.View key="wait-actions" entering={FadeIn.duration(250)} style={styles.actions}>
            <Button
              title={t('auth.wait.reopen')}
              icon="paper-plane"
              disabled={flow.stage === 'done'}
              onPress={() => void openTelegram(flow.attempt).catch(() => undefined)}
            />
            <PressableScale
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => {
                haptics.selection();
                cancelTelegram();
              }}
              disabled={flow.stage === 'done'}
              style={styles.link}
            >
              <AppText variant="bodyStrong" color={home.accent}>
                {t('auth.wait.cancel')}
              </AppText>
            </PressableScale>
          </Animated.View>
        ) : (
          <AppText variant="caption" color={home.textMuted} style={styles.center}>
            {t('auth.terms')}
          </AppText>
        )}
      </View>
    </View>
  );
}

function failureOf(error: unknown): Failure | null {
  if (error instanceof SignInCancelled) return null;
  if (error instanceof TelegramDeclined) return 'declined';
  if (error instanceof TelegramExpired) return 'expired';
  if (error instanceof GoogleUnavailable) return 'googleUnavailable';
  if (error instanceof NetworkError) return 'network';
  if (error instanceof ApiError && error.type === 'blocked') return 'blocked';
  if (error instanceof ApiError && error.type === 'telegram_unavailable') return 'telegram';
  return 'failed';
}

/** Google Sign-In errors carry a `code` (e.g. DEVELOPER_ERROR / 10), API errors an HTTP `status`. */
function describeError(error: unknown): string {
  if (error instanceof ApiError) return `API ${error.status}${error.type ? ` · ${error.type}` : ''}`;
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    return code !== undefined ? `[${String(code)}] ${error.message}` : `${error.name}: ${error.message}`;
  }
  return String(error);
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: home.background },
    backdrop: { position: 'absolute', top: 0, left: 0, right: 0, height: 380 },
    top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl },
    scroll: { flexGrow: 1, justifyContent: 'center', gap: spacing.xxl, paddingHorizontal: spacing.xl, paddingVertical: spacing.xl },
    heading: { gap: spacing.sm },
    center: { textAlign: 'center' },
    failure: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderBottomWidth: 4,
      borderColor: home.dangerRim,
      borderBottomColor: home.dangerEdge,
      backgroundColor: home.dangerFill,
    },
    failureIcon: { width: 36, height: 36, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: home.panel },
    failureTexts: { flex: 1, gap: 2 },
    footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
    actions: { gap: spacing.md },
    link: { alignSelf: 'center', paddingVertical: spacing.sm },
  });
