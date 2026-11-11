import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { useT } from '@/i18n';
import { useSettingsStore } from '@/store/settingsStore';
import { radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { ACCENT, shade } from './color';
import { PASS_SCORE, type PathStage } from './path';
import { StarRow } from './StarRow';

interface StageSheetProps {
  stage: PathStage | null;
  /** The stage before this one, named in the hint on a locked stage. */
  previous: PathStage | null;
  visible: boolean;
  onClose: () => void;
  onClosed: () => void;
  onStart: (stage: PathStage) => void;
}

/** Details of one stage: its picture, the learner's record on it and the way in (or why it is shut). */
export function StageSheet({ stage, previous, visible, onClose, onClosed, onStart }: StageSheetProps) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const t = useT();
  const language = useSettingsStore((state) => state.language);

  return (
    <BottomSheet visible={visible} onClose={onClose} onClosed={onClosed} closeLabel={t('common.close')}>
      {stage ? (
        <View style={styles.body}>
          <View style={[styles.cover, { backgroundColor: '#0B1F3A' }]}>
            {stage.scenario.image ? (
              <Image source={stage.scenario.image} contentFit="cover" transition={200} style={StyleSheet.absoluteFill} />
            ) : (
              // A topic added on the server may have no picture: its own icon, large and faint, stands in.
              <LinearGradient
                colors={[shade(ACCENT, -0.1), '#0B1F3A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, styles.coverArt]}
              >
                <Ionicons name={stage.scenario.icon} size={120} color="rgba(255,255,255,0.28)" />
              </LinearGradient>
            )}
            <LinearGradient
              colors={['rgba(8,24,40,0.05)', 'rgba(8,24,40,0.35)', 'rgba(8,24,40,0.88)']}
              locations={[0, 0.45, 1]}
              style={StyleSheet.absoluteFill}
            />
            {stage.status === 'locked' ? <View style={styles.coverLocked} /> : null}
            <View style={[styles.stagePill, { backgroundColor: ACCENT }]}>
              <AppText variant="captionStrong" color="#FFFFFF" style={styles.stageText}>
                {t('path.stage', { n: stage.number }).toUpperCase()}
              </AppText>
            </View>
            <View style={styles.statusChip}>
              <Ionicons
                name={stage.status === 'passed' ? 'checkmark-circle' : stage.status === 'locked' ? 'lock-closed' : 'play-circle'}
                size={15}
                color="#FFFFFF"
              />
              <AppText variant="captionStrong" color="#FFFFFF">
                {stage.status === 'passed' ? t('path.passed') : stage.status === 'locked' ? t('path.locked') : t('path.notPassed')}
              </AppText>
            </View>
            <View style={styles.caption}>
              <AppText variant="title" color="#FFFFFF" numberOfLines={1} style={styles.title}>
                {stage.scenario.title[language]}
              </AppText>
              <AppText variant="caption" color="rgba(255,255,255,0.88)" numberOfLines={2}>
                {stage.scenario.subtitle[language]}
              </AppText>
            </View>
          </View>

          <View style={styles.stats}>
            <Stat label={t('path.best')} styles={styles}>
              <AppText variant="heading" color={stage.best !== null ? home.text : home.textMuted}>
                {stage.best !== null ? `${stage.best}/10` : '—'}
              </AppText>
            </Stat>
            <View style={styles.divider} />
            <Stat label={t('path.stars')} styles={styles}>
              <StarRow count={stage.stars} size={18} />
            </Stat>
            <View style={styles.divider} />
            <Stat label={t('path.attempts')} styles={styles}>
              <AppText variant="heading" color={home.text}>
                {stage.attempts}
              </AppText>
            </Stat>
          </View>

          <View style={[styles.note, stage.status === 'locked' && styles.noteLocked]}>
            <Ionicons
              name={stage.status === 'locked' ? 'lock-closed' : 'flag'}
              size={18}
              color={stage.status === 'locked' ? home.textMuted : ACCENT}
            />
            <AppText variant="caption" color={home.textSecondary} style={styles.noteText}>
              {stage.status === 'locked' && previous
                ? t('path.lockedHint', { prev: previous.scenario.title[language], score: PASS_SCORE })
                : t('path.goal', { score: PASS_SCORE })}
            </AppText>
          </View>

          {stage.status !== 'locked' ? (
            <Button
              title={stage.status === 'passed' ? t('path.retry') : t('path.start')}
              icon={stage.status === 'passed' ? 'refresh' : 'arrow-forward'}
              iconPosition="right"
              onPress={() => onStart(stage)}
            />
          ) : (
            <Button title={t('common.close')} variant="soft" onPress={onClose} />
          )}
        </View>
      ) : null}
    </BottomSheet>
  );
}

function Stat({ label, children, styles }: { label: string; children: ReactNode; styles: ReturnType<typeof createStyles> }) {
  const home = usePalette();
  return (
    <View style={styles.stat}>
      <View style={styles.statValue}>{children}</View>
      <AppText variant="caption" color={home.textMuted}>
        {label}
      </AppText>
    </View>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    body: { gap: spacing.lg, paddingTop: spacing.sm },
    cover: { height: 190, borderRadius: radii.xl, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: home.primarySoft },
    coverArt: { alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: spacing.md, paddingRight: spacing.lg },
    coverLocked: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(30,34,44,0.45)' },
    stagePill: {
      position: 'absolute',
      top: spacing.md,
      left: spacing.md,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radii.pill,
    },
    stageText: { fontSize: 11, lineHeight: 15, letterSpacing: 0.8, fontWeight: '800' },
    statusChip: {
      position: 'absolute',
      top: spacing.md,
      right: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radii.pill,
      backgroundColor: 'rgba(8,24,40,0.45)',
    },
    caption: { padding: spacing.lg, gap: 2 },
    title: { fontSize: 24, lineHeight: 29 },
    stats: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: home.track,
    },
    stat: { flex: 1, alignItems: 'center', gap: 2 },
    statValue: { height: 28, justifyContent: 'center' },
    divider: { width: 1, height: 34, backgroundColor: home.divider },
    note: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radii.md,
      backgroundColor: home.primaryTint,
    },
    noteLocked: { backgroundColor: home.track },
    noteText: { flex: 1 },
  });
