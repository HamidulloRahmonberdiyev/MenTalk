import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ErrorView, LoadingView } from '@/components/ui/StateViews';
import { useT, type TranslationKey } from '@/i18n';
import { endpoints, type ApiCertificateStatus } from '@/services/api/endpoints';
import { haptics } from '@/services/haptics';
import { savePlacement } from '@/services/session';
import { useSettingsStore } from '@/store/settingsStore';
import { radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import type { PlacementResult } from '../onboarding/placement/placement';
import { PlacementTest } from '../onboarding/placement/PlacementTest';
import { saveCertificate, shareCertificate } from './certificatePdf';
import { CertificatePreview } from './CertificatePreview';

type Busy = 'issue' | 'save' | 'share' | null;

export function CertificateScreen() {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const studyLanguage = useSettingsStore((state) => state.studyLanguage);

  const [status, setStatus] = useState<ApiCertificateStatus | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [notice, setNotice] = useState<TranslationKey | null>(null);

  const load = useCallback(
    () =>
      endpoints
        .certificateStatus()
        .then(setStatus)
        .catch(() => setLoadFailed(true)),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  /** Runs one button's work, with the spinner on that button and any failure said on screen. */
  const run = async (kind: Exclude<Busy, null>, work: () => Promise<TranslationKey | null>) => {
    setBusy(kind);
    setNotice(null);
    try {
      setNotice(await work());
    } catch {
      setNotice('certificate.failed');
    } finally {
      setBusy(null);
    }
  };

  const finishPlacement = (result: PlacementResult) => {
    setPlacing(false);
    void run('issue', async () => {
      await savePlacement(result);
      await load();
      return null;
    });
  };

  if (placing) {
    return <PlacementTest language={studyLanguage} onFinish={finishPlacement} onExit={() => setPlacing(false)} />;
  }

  const certificate = status?.certificate ?? null;
  const canIssue = status !== null && status.eligible && certificate?.level !== status.level;

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
      <StatusBar style={home.statusBar} />
      <ScreenHeader title={t('certificate.title')} onBack={() => router.back()} style={styles.header} />

      {status === null ? (
        loadFailed ? (
          <ErrorView
            message={t('certificate.loadFailed')}
            onRetry={() => {
              setLoadFailed(false);
              void load();
            }}
          />
        ) : (
          <LoadingView />
        )
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]} showsVerticalScrollIndicator={false}>
          {certificate ? (
            <>
              <CertificatePreview certificate={certificate} />
              <Button
                title={t('certificate.download')}
                icon="download"
                loading={busy === 'save'}
                disabled={busy !== null}
                onPress={() =>
                  void run('save', async () => {
                    const saved = await saveCertificate(certificate);
                    if (saved) haptics.success();
                    return saved ? 'certificate.saved' : null;
                  })
                }
              />
              <Button
                title={t('certificate.share')}
                icon="share-social"
                variant="soft"
                loading={busy === 'share'}
                disabled={busy !== null}
                onPress={() =>
                  void run('share', async () => {
                    await shareCertificate(certificate);
                    return null;
                  })
                }
              />
            </>
          ) : (
            <View style={styles.intro}>
              <AppText style={styles.emblem}>🎓</AppText>
              <AppText variant="heading" style={styles.center} accessibilityRole="header">
                {t('certificate.lead.title')}
              </AppText>
              <AppText variant="body" color={home.textSecondary} style={styles.center}>
                {t('certificate.lead.text')}
              </AppText>
            </View>
          )}

          {notice ? (
            <AppText variant="caption" color={notice === 'certificate.saved' ? home.successInk : home.textSecondary} style={styles.center}>
              {t(notice)}
            </AppText>
          ) : null}

          {canIssue ? (
            <Button
              title={certificate ? t('certificate.issueNew', { level: status.cefr ?? '' }) : t('certificate.issue')}
              icon="ribbon"
              variant={certificate ? 'soft' : 'primary'}
              loading={busy === 'issue'}
              disabled={busy !== null}
              onPress={() =>
                void run('issue', async () => {
                  await endpoints.issueCertificate();
                  haptics.success();
                  await load();
                  return null;
                })
              }
            />
          ) : null}

          {!status.eligible ? (
            <View style={styles.steps}>
              <Requirement done={status.placed} title={t('certificate.req.placement')}>
                {status.placed ? null : <Button title={t('certificate.req.placement.action')} variant="soft" disabled={busy !== null} onPress={() => setPlacing(true)} />}
              </Requirement>
              <Requirement
                done={status.conversations >= status.required_conversations}
                title={t('certificate.req.talks', { n: Math.min(status.conversations, status.required_conversations), total: status.required_conversations })}
              >
                {status.conversations >= status.required_conversations ? null : (
                  <>
                    <ProgressBar value={status.conversations / status.required_conversations} />
                    <Button title={t('certificate.req.talks.action')} variant="soft" onPress={() => router.push('/scenarios')} />
                  </>
                )}
              </Requirement>
            </View>
          ) : null}

          <AppText variant="caption" color={home.textMuted} style={styles.center}>
            {t('certificate.disclaimer')}
          </AppText>
        </ScrollView>
      )}
    </View>
  );
}

function Requirement({ done, title, children }: { done: boolean; title: string; children: React.ReactNode }) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.step}>
      <View style={styles.stepRow}>
        <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={done ? home.successInk : home.textMuted} />
        <AppText variant="bodyStrong" color={home.text} style={styles.stepTitle}>
          {title}
        </AppText>
      </View>
      {children}
    </View>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: home.background },
    header: { paddingHorizontal: spacing.xl },
    content: { gap: spacing.lg, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
    intro: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
    emblem: { fontSize: 56, lineHeight: 68 },
    center: { textAlign: 'center' },
    steps: { gap: spacing.md },
    step: {
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderColor: home.rim,
      backgroundColor: home.panel,
    },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    stepTitle: { flex: 1 },
  });
