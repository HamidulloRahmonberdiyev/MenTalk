import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ErrorView } from '@/components/ui/StateViews';
import { useT, type TranslationKey } from '@/i18n';
import { haptics } from '@/services/haptics';
import { radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { certificateHtml, PAGE_HEIGHT, PAGE_WIDTH, saveCertificate, shareCertificate } from './certificatePdf';

/** The paper the page is printed on, shown while it loads so the sheet does not flash in. */
const PAPER = '#FBF8F1';
const MAX_SHEET_WIDTH = 560;

type Busy = 'save' | 'share' | null;

/** The page is HTML, never a link out: anything trying to navigate away is blocked. */
const staysOnPage = ({ url }: WebViewNavigation) => url.startsWith('about:') || url.startsWith('data:');

/**
 * The certificate exactly as the PDF will be: the same server page, shown full width with pinch
 * to zoom, before the learner decides to save or share it.
 */
export function CertificateViewer() {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { serial } = useLocalSearchParams<{ serial: string }>();

  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [notice, setNotice] = useState<TranslationKey | null>(null);

  const sheetWidth = Math.min(width - spacing.lg * 2, MAX_SHEET_WIDTH);
  const sheetHeight = (sheetWidth * PAGE_HEIGHT) / PAGE_WIDTH;

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!serial) return;
    let current = true;
    certificateHtml(serial).then(
      (page) => current && setHtml(page),
      () => current && setFailed(true),
    );
    return () => {
      current = false;
    };
  }, [serial, attempt]);

  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((value) => value + 1);
  }, []);

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

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
      <StatusBar style={home.statusBar} />
      <ScreenHeader title={t('certificate.title')} onBack={() => router.back()} style={styles.header} />

      {failed ? (
        <ErrorView message={t('certificate.loadFailed')} onRetry={retry} />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={[styles.sheet, { width: sheetWidth, height: sheetHeight }]}>
              {html ? (
                <WebView
                  source={{ html }}
                  originWhitelist={['*']}
                  onShouldStartLoadWithRequest={staysOnPage}
                  onLoadEnd={() => setRendered(true)}
                  // The page is exactly as tall as the sheet: it only moves once zoomed in.
                  bounces={false}
                  overScrollMode="never"
                  showsVerticalScrollIndicator={false}
                  showsHorizontalScrollIndicator={false}
                  setBuiltInZoomControls
                  setDisplayZoomControls={false}
                  javaScriptEnabled={false}
                  style={styles.page}
                />
              ) : null}
              {!rendered ? (
                <View style={styles.loading} pointerEvents="none">
                  <ActivityIndicator color="#B98F3E" />
                </View>
              ) : null}
            </View>
            {rendered ? (
              <Animated.View entering={FadeIn}>
                <AppText variant="caption" color={home.textMuted} style={styles.center}>
                  {t('certificate.viewer.zoom')}
                </AppText>
              </Animated.View>
            ) : null}
          </ScrollView>

          <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.md }]}>
            {notice ? (
              <AppText variant="caption" color={notice === 'certificate.saved' ? home.successInk : home.textSecondary} style={styles.center}>
                {t(notice)}
              </AppText>
            ) : null}
            <View style={styles.row}>
              <View style={styles.flex}>
                <Button
                  title={t('certificate.download')}
                  icon="download"
                  loading={busy === 'save'}
                  disabled={busy !== null || !html}
                  onPress={() =>
                    void run('save', async () => {
                      const saved = await saveCertificate(serial);
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
                disabled={busy !== null || !html}
                onPress={() =>
                  void run('share', async () => {
                    await shareCertificate(serial);
                    return null;
                  })
                }
              />
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: home.background },
    header: { paddingHorizontal: spacing.xl },
    content: { alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },
    sheet: {
      borderRadius: radii.sm,
      overflow: 'hidden',
      backgroundColor: PAPER,
      // A sheet of paper lifted off the screen.
      shadowColor: '#0B1F3A',
      shadowOpacity: 0.22,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
    page: { flex: 1, backgroundColor: PAPER },
    loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: PAPER },
    center: { textAlign: 'center' },
    actions: { gap: spacing.sm, paddingHorizontal: spacing.xl, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: home.rim, backgroundColor: home.background },
    row: { flexDirection: 'row', gap: spacing.sm },
    flex: { flex: 1 },
  });
