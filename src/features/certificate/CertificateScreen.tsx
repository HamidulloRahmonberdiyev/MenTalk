import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
import { certificateHtml, saveCertificate, shareCertificate } from './certificatePdf';
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

  // Fetched ahead, so the certificate opens at once when tapped.
  const serial = status?.certificate?.serial;
  useEffect(() => {
    if (serial) certificateHtml(serial).catch(() => undefined);
  }, [serial]);

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
  const openViewer = (serial: string) => {
    haptics.selection();
    router.push({ pathname: '/certificate-view', params: { serial } });
  };
  // Any time: the server returns the current certificate when nothing changed, a new one otherwise.
  const canIssue = status !== null && status.eligible;

  const issue = () =>
    run('issue', async () => {
      const issued = await endpoints.issueCertificate();
      haptics.success();
      await load();
      return issued.serial === certificate?.serial ? 'certificate.upToDate' : certificate ? 'certificate.updated' : null;
    });

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
              <Pressable accessibilityRole="button" accessibilityLabel={t('certificate.view')} onPress={() => openViewer(certificate.serial)}>
                <CertificatePreview certificate={certificate} />
              </Pressable>
              <Button title={t('certificate.view')} icon="document-text" disabled={busy !== null} onPress={() => openViewer(certificate.serial)} />
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Button
                    title={t('certificate.download')}
                    icon="download"
                    variant="soft"
                    loading={busy === 'save'}
                    disabled={busy !== null}
                    onPress={() =>
                      void run('save', async () => {
                        const saved = await saveCertificate(certificate.serial);
                        if (saved) haptics.success();
                        return saved ? 'certificate.saved' : null;
                      })
                    }
                  />
                </View>
                <Button
                  title={t('certificate.share')}
                  icon="share-social"
                  variant="soft"
                  loading={busy === 'share'}
                  disabled={busy !== null}
                  onPress={() =>
                    void run('share', async () => {
                      await shareCertificate(certificate.serial);
                      return null;
                    })
                  }
                />
              </View>
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
            <AppText variant="caption" color={notice === 'certificate.saved' || notice === 'certificate.updated' ? home.successInk : home.textSecondary} style={styles.center}>
              {t(notice)}
            </AppText>
          ) : null}

          {canIssue ? (
            <View style={styles.standing}>
              <AppText variant="bodyStrong" color={home.text} style={styles.center}>
                {t('certificate.current', { level: status.cefr ?? '' })}
              </AppText>
              <AppText variant="caption" color={home.textSecondary} style={styles.center}>
                {t('certificate.basis', { parts: basisOf(status, t) })}
              </AppText>
              <Button
                title={certificate ? t('certificate.refresh') : t('certificate.issue')}
                icon={certificate ? 'refresh' : 'ribbon'}
                variant={certificate ? 'soft' : 'primary'}
                loading={busy === 'issue'}
                disabled={busy !== null}
                onPress={() => void issue()}
              />
            </View>
          ) : (
            <Requirement done={false} title={t('certificate.req.start')}>
              <Button title={t('certificate.req.words.action')} variant="soft" onPress={() => router.navigate('/words')} />
              <Button title={t('certificate.req.talks.action')} variant="soft" onPress={() => router.push('/scenarios')} />
              <Button title={t('certificate.req.placement.action')} variant="soft" disabled={busy !== null} onPress={() => setPlacing(true)} />
            </Requirement>
          )}

          {/* How to climb: conversations are what the higher levels rest on. */}
          {canIssue && status.conversations < status.required_conversations ? (
            <Requirement done={false} title={t('certificate.raise', { n: status.required_conversations })}>
              <ProgressBar value={status.conversations / status.required_conversations} />
              <Button title={t('certificate.req.talks.action')} variant="soft" onPress={() => router.push('/scenarios')} />
              {status.placed ? null : (
                <Button title={t('certificate.req.placement.action')} variant="soft" disabled={busy !== null} onPress={() => setPlacing(true)} />
              )}
            </Requirement>
          ) : null}

          <AppText variant="caption" color={home.textMuted} style={styles.center}>
            {t('certificate.disclaimer')}
          </AppText>
        </ScrollView>
      )}
    </View>
  );
}

/** "level test · 3 conversations · 40 words": what the level on the next certificate rests on. */
function basisOf(status: ApiCertificateStatus, t: ReturnType<typeof useT>): string {
  return [
    status.placed ? t('certificate.basis.placement') : null,
    status.conversations > 0 ? t('certificate.basis.talks', { n: status.conversations }) : null,
    status.words ? t('certificate.basis.words', { n: status.words }) : null,
  ]
    .filter(Boolean)
    .join(' · ');
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
    standing: { gap: spacing.sm },
    row: { flexDirection: 'row', gap: spacing.sm },
    flex: { flex: 1 },
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
