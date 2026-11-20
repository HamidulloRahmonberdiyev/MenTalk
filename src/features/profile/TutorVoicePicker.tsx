import { Ionicons } from '@expo/vector-icons';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useT } from '@/i18n';
import { endpoints, type ApiTutorVoice } from '@/services/api/endpoints';
import { useSettingsStore } from '@/store/settingsStore';
import { colors, radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { Tile } from './TutorCard';

/** Tiles per row: wide enough for a name like "Дружелюбный" on a small phone. */
const PER_ROW = 3;
/** A sample that has not started by then is reported as failed instead of spinning forever. */
const SAMPLE_START_TIMEOUT_MS = 12_000;
const GENDERS = ['female', 'male'] as const;

type VoiceList = { status: 'loading' } | { status: 'failed' } | { status: 'ready'; voices: ApiTutorVoice[] };

function rows<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += PER_ROW) out.push(items.slice(i, i + PER_ROW));
  return out;
}

/**
 * The tutor's voice, from the list admins keep on the server: female and male voices, each heard
 * by tapping it. The pick applies to conversations started from now on; one under way keeps its voice.
 */
export function TutorVoicePicker() {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const uiLanguage = useSettingsStore((state) => state.language);
  const study = useSettingsStore((state) => state.studyLanguage);
  const chosen = useSettingsStore((state) => state.tutorVoice);
  const setChosen = useSettingsStore((state) => state.setTutorVoice);

  const [reload, setReload] = useState(0);
  /** The answer for one language and attempt; another key in flight shows as loading. */
  const listKey = `${study}#${reload}`;
  const [fetched, setFetched] = useState<{ key: string; voices: ApiTutorVoice[] | null } | null>(null);
  const list: VoiceList =
    fetched?.key !== listKey ? { status: 'loading' } : fetched.voices ? { status: 'ready', voices: fetched.voices } : { status: 'failed' };
  /** The voice whose sample is loading (`started: false`) or playing. */
  const [sample, setSample] = useState<{ id: number; started: boolean } | null>(null);
  const [sampleFailed, setSampleFailed] = useState(false);
  const player = useRef<AudioPlayer | null>(null);
  const request = useRef<AbortController | null>(null);
  const startTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    endpoints.tutorVoices(study, controller.signal).then(
      (voices) => setFetched({ key: listKey, voices }),
      () => {
        if (!controller.signal.aborted) setFetched({ key: listKey, voices: null });
      },
    );
    return () => controller.abort();
  }, [study, listKey]);

  // Admins may remove a voice or swap it for another: a pick that is gone means the default again.
  const loaded = fetched?.key === listKey ? fetched.voices : null;
  useEffect(() => {
    if (!loaded || !chosen) return;
    const current = loaded.find((voice) => voice.id === chosen.id);
    if (!current) setChosen(null);
    else if (current.gender !== chosen.gender) setChosen({ id: current.id, gender: current.gender });
  }, [loaded, chosen, setChosen]);

  const stopSample = useCallback(() => {
    request.current?.abort();
    request.current = null;
    if (startTimer.current) clearTimeout(startTimer.current);
    startTimer.current = null;
    player.current?.remove();
    player.current = null;
    setSample(null);
  }, []);

  useEffect(() => stopSample, [stopSample]);

  const playSample = useCallback(
    async (voice: ApiTutorVoice) => {
      stopSample();
      setSampleFailed(false);
      const controller = new AbortController();
      request.current = controller;
      setSample({ id: voice.id, started: false });

      const fail = () => {
        if (controller.signal.aborted) return;
        stopSample();
        setSampleFailed(true);
      };
      startTimer.current = setTimeout(fail, SAMPLE_START_TIMEOUT_MS);

      try {
        const { url } = await endpoints.voiceSample(voice.id, study, controller.signal);
        // iOS mutes playback in silent mode unless the audio session allows it.
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => undefined);
        if (controller.signal.aborted) return;

        const next = createAudioPlayer({ uri: url });
        player.current = next;
        next.addListener('playbackStatusUpdate', (status) => {
          if (player.current !== next) return;
          if (status.error) return fail();
          if (status.playing) {
            if (startTimer.current) clearTimeout(startTimer.current);
            startTimer.current = null;
            setSample((current) => (current?.id === voice.id && current.started ? current : { id: voice.id, started: true }));
          }
          if (status.didJustFinish) stopSample();
        });
        next.play();
      } catch {
        fail();
      }
    },
    [stopSample, study],
  );

  const voices = list.status === 'ready' ? list.voices : [];
  const selectedId = voices.some((voice) => voice.id === chosen?.id) ? chosen?.id : voices.find((voice) => voice.default)?.id;
  const nameOf = (voice: ApiTutorVoice) => voice.name[uiLanguage] ?? voice.name.en ?? Object.values(voice.name)[0] ?? '';

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <Ionicons name="mic" size={22} color="#FFFFFF" />
        </View>
        <View style={styles.flex}>
          <AppText variant="bodyStrong" color={home.text}>
            {t('tutor.voice')}
          </AppText>
          <AppText variant="caption" color={home.textMuted}>
            {t('tutor.voice.hint')}
          </AppText>
        </View>
      </View>

      {list.status === 'loading' && <ActivityIndicator color={colors.primary} style={styles.loading} />}

      {list.status === 'failed' && (
        <View style={styles.failed}>
          <AppText variant="caption" color={home.textMuted}>
            {t('tutor.voice.loadFailed')}
          </AppText>
          <Button title={t('common.retry')} variant="soft" icon="refresh" onPress={() => setReload((n) => n + 1)} />
        </View>
      )}

      {GENDERS.map((gender) => {
        const group = voices.filter((voice) => voice.gender === gender);
        if (group.length === 0) return null;
        return (
          <View key={gender} style={styles.group}>
            <AppText variant="captionStrong" color={home.textMuted}>
              {t(`tutor.voice.${gender}`)}
            </AppText>
            <View accessibilityRole="radiogroup" accessibilityLabel={t(`tutor.voice.${gender}`)} style={styles.rows}>
              {rows(group).map((row) => (
                <View key={row[0].id} style={styles.row}>
                  {row.map((voice) => {
                    const playing = sample?.id === voice.id;
                    const selected = voice.id === selectedId;
                    return (
                      <Tile
                        key={voice.id}
                        label={nameOf(voice)}
                        selected={selected}
                        onPress={() => {
                          setChosen({ id: voice.id, gender: voice.gender });
                          if (playing) stopSample();
                          else void playSample(voice);
                        }}
                      >
                        <View style={styles.glyph}>
                          {playing && !sample.started ? (
                            <ActivityIndicator size="small" color={selected ? home.accent : home.textMuted} />
                          ) : (
                            <Ionicons
                              name={playing ? 'volume-high' : gender === 'female' ? 'woman' : 'man'}
                              size={24}
                              color={selected || playing ? home.accent : home.textMuted}
                            />
                          )}
                        </View>
                      </Tile>
                    );
                  })}
                  {/* Keeps a short last row in the same grid as the full ones. */}
                  {Array.from({ length: PER_ROW - row.length }, (_, i) => (
                    <View key={`gap-${i}`} style={styles.flex} />
                  ))}
                </View>
              ))}
            </View>
          </View>
        );
      })}

      {sampleFailed && (
        <AppText variant="caption" color={home.dangerInk}>
          {t('tutor.voice.sampleFailed')}
        </AppText>
      )}
    </View>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    card: {
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderBottomWidth: 6,
      borderColor: home.rim,
      borderBottomColor: home.rimBottom,
      backgroundColor: home.panel,
    },
    head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    icon: {
      width: 40,
      height: 40,
      borderRadius: radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    flex: { flex: 1 },
    loading: { paddingVertical: spacing.lg },
    failed: { gap: spacing.sm, alignItems: 'flex-start' },
    group: { gap: spacing.xs },
    rows: { gap: spacing.sm },
    row: { flexDirection: 'row', gap: spacing.sm },
    glyph: { height: 32, alignItems: 'center', justifyContent: 'center' },
  });
