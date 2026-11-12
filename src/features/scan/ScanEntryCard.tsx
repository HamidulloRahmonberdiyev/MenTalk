import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { radii, spacing } from '@/theme';

/**
 * The way into "words from a photo" on the translator: a blue card with a mini page whose words are
 * highlighted, so what it does reads before the text does.
 */
export function ScanEntryCard() {
  const t = useT();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${t('scan.entry.title')}. ${t('scan.entry.text')}`}
      scaleTo={0.98}
      onPress={() => {
        haptics.light();
        router.push('/scan');
      }}
      style={styles.shell}
    >
      <LinearGradient colors={['#4CC6FA', '#2AABEE', '#1A8BD8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <View pointerEvents="none" style={styles.orb} />

        <View style={styles.texts}>
          <View style={styles.badge}>
            <AppText color="#0B4F86" style={styles.badgeText}>
              {t('scan.entry.badge')}
            </AppText>
          </View>
          <AppText color="#FFFFFF" style={styles.title}>
            {t('scan.entry.title')}
          </AppText>
          <AppText color="rgba(255,255,255,0.88)" style={styles.text}>
            {t('scan.entry.text')}
          </AppText>
          <View style={styles.cta}>
            <Ionicons name="camera" size={16} color="#1A8BD8" />
            <AppText color="#1A8BD8" style={styles.ctaText}>
              {t('scan.entry.cta')}
            </AppText>
          </View>
        </View>

        <MiniPage />
      </LinearGradient>
    </PressableScale>
  );
}

/** A tilted little book page: grey lines of text with a few words marked in highlighter. */
function MiniPage() {
  const rows: (number | 'mark')[][] = [
    [22, 'mark', 14],
    [30, 18],
    ['mark', 26, 10],
    [16, 20, 'mark'],
    [34, 12],
  ];
  return (
    <View style={styles.pageWrap}>
      <View style={styles.page}>
        {rows.map((row, index) => (
          <View key={index} style={styles.line}>
            {row.map((width, position) =>
              width === 'mark' ? (
                <View key={position} style={styles.marked} />
              ) : (
                <View key={position} style={[styles.ink, { width }]} />
              ),
            )}
          </View>
        ))}
      </View>
      <View style={styles.lens}>
        <Ionicons name="scan" size={22} color="#FFFFFF" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { borderRadius: radii.xl, boxShadow: '0 10px 24px rgba(26, 139, 216, 0.3)' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    paddingRight: spacing.md,
    borderRadius: radii.xl,
    borderBottomWidth: 5,
    borderBottomColor: '#126FB3',
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    right: -40,
    top: -50,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  texts: { flex: 1, gap: 6, alignItems: 'flex-start' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.pill, backgroundColor: '#FFD43B' },
  badgeText: { fontSize: 10.5, lineHeight: 14, fontWeight: '900', letterSpacing: 0.6 },
  title: { fontSize: 18, lineHeight: 23, fontWeight: '900', letterSpacing: -0.2 },
  text: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
  },
  ctaText: { fontSize: 13, lineHeight: 17, fontWeight: '900' },
  pageWrap: { width: 96, height: 112, alignItems: 'center', justifyContent: 'center' },
  page: {
    width: 84,
    height: 100,
    gap: 7,
    paddingHorizontal: 9,
    paddingTop: 14,
    borderRadius: 8,
    backgroundColor: '#FCF8EF',
    transform: [{ rotate: '6deg' }],
    boxShadow: '0 8px 16px rgba(8, 60, 110, 0.3)',
  },
  line: { flexDirection: 'row', gap: 4 },
  ink: { height: 5, borderRadius: 3, backgroundColor: 'rgba(43, 38, 32, 0.22)' },
  marked: { width: 20, height: 7, marginTop: -1, borderRadius: 3, backgroundColor: 'rgba(255, 200, 30, 0.85)' },
  lens: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B4F86',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
});
